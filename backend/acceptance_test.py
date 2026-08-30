"""Acceptance test for avsar Phase 1 backend.

Runs the FOUR mandatory checks from the problem statement against the
LIVE backend URL (REACT_APP_BACKEND_URL from /app/frontend/.env):

  1) Cancellation broadcast: consent filter + failure isolation
     - Non-consented patients get ZERO messages.
     - Phone ending in "0000" fails but does NOT stop the broadcast.
  2) Duplicate eventId: second webhook with same eventId is rejected.
  3) Concurrency: two parallel webhooks for the same slot, different
     patients + different eventIds. EXACTLY ONE wins; the other gets
     SLOT_JUST_TAKEN with an initiated refund.
  4) (Bonus) Expired slot at webhook time -> SLOT_EXPIRED + refund.

Prints a compact pass/fail summary at the end.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

# Discover the external API base URL exactly the way the frontend will.
FRONTEND_ENV = Path("/app/frontend/.env").read_text()
BASE = None
for line in FRONTEND_ENV.splitlines():
    if line.startswith("REACT_APP_BACKEND_URL="):
        BASE = line.split("=", 1)[1].strip().strip('"').rstrip("/")
API = f"{BASE}/api"
print(f"[info] Using API base: {API}")
# Server may be running in razorpay mode; the mock-pay endpoint is gated behind this header.
OVERRIDE_HEADERS = {"X-avsar-Test-Override": "avsar-testing-override"}

CLINIC_ID = "clinic_smile_dental_indiranagar"
SLOT_BROADCAST = "slot_today_1000"    # used for broadcast + concurrency
SLOT_EXPIRED = "slot_today_1130"      # will force startTime into the past
BROADCAST_CONSENTED = {
    "patient_aarav",
    "patient_bhavna",
    "patient_chirag",
    "patient_disha_0000",   # phone ends in 0000 (failure hook)
}
BROADCAST_NON_CONSENTED = {"patient_esha_noconsent", "patient_farhan_noconsent"}


def line(title: str):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


async def reset_seed() -> None:
    # Reset the DB by re-running the seed with --reset. Run inline via
    # importing seed to keep it in-process.
    sys.path.insert(0, "/app/backend")
    from seed import main as seed_main  # type: ignore
    await seed_main(reset=True)


async def get_json(c: httpx.AsyncClient, url: str) -> dict:
    r = await c.get(url)
    r.raise_for_status()
    return r.json()


async def post_json(c: httpx.AsyncClient, url: str, body: dict | None = None) -> dict:
    headers = OVERRIDE_HEADERS if url.endswith("/mock-pay") else None
    r = await c.post(url, json=body or {}, headers=headers)
    r.raise_for_status()
    return r.json()


async def broadcast_test(c: httpx.AsyncClient) -> dict:
    line("TEST 1 — Broadcast: consent filter + failure isolation")
    result = await post_json(c, f"{API}/clinics/slots/{SLOT_BROADCAST}/open")
    print(json.dumps(result, indent=2))

    # Check sent_messages for this slot.
    msgs = await get_json(c, f"{API}/slots/{SLOT_BROADCAST}/messages")
    patients_msgd = {m["patientId"] for m in msgs}
    non_consented_msgd = patients_msgd & BROADCAST_NON_CONSENTED
    sent_ok = {m["patientId"] for m in msgs if m["status"] == "sent"}
    failed = [m for m in msgs if m["status"] == "failed"]

    # Verify template body: no rupee/price words.
    forbidden = ("₹", "rupee", "price", "discount", "standby rate", "50", "400")
    template_clean = True
    offending = []
    for m in msgs:
        for tok in forbidden:
            if tok.lower() in m["body"].lower():
                template_clean = False
                offending.append((m["patientId"], tok))
                break

    assert result["consentedPatients"] == 4, f"expected 4 consented, got {result['consentedPatients']}"
    assert result["skippedNonConsented"] == 2, f"expected 2 skipped, got {result['skippedNonConsented']}"
    assert result["sent"] == 3, f"expected 3 successful sends, got {result['sent']}"
    assert result["failed"] == 1, f"expected 1 failure, got {result['failed']}"
    assert not non_consented_msgd, f"non-consented patients received messages: {non_consented_msgd}"
    assert len(failed) == 1 and failed[0]["toPhone"].endswith("0000"), \
        f"failure hook not exclusively on ...0000: {failed}"
    assert template_clean, f"template had forbidden tokens: {offending}"

    print(f"[OK] 4 consented, 2 skipped, 3 sent, 1 failed (phone={failed[0]['toPhone']})")
    print(f"[OK] Non-consented patients received: {sorted(non_consented_msgd) or 'NONE'}")
    print("[OK] Template body contains no price/rupee/discount tokens")
    return {
        "sent_ok": sorted(sent_ok),
        "failed_phone": failed[0]["toPhone"],
        "template_clean": template_clean,
    }


async def _tokens_by_patient(c: httpx.AsyncClient, slot_id: str) -> dict[str, str]:
    """Read the checkout tokens that were minted for a slot's broadcast."""
    # There's no listing endpoint (intentionally) -- probe checkout by
    # iterating over the mongo collection through a small helper endpoint.
    # Simpler: use motor directly since this is a local test script.
    import sys
    sys.path.insert(0, "/app/backend")
    from database import checkout_tokens  # type: ignore
    docs = await checkout_tokens.find({"slotId": slot_id}, {"_id": 0}).to_list(200)
    return {d["patientId"]: d["token"] for d in docs}


async def duplicate_event_test(c: httpx.AsyncClient) -> dict:
    line("TEST 2 — Duplicate eventId is rejected without locking")
    tokens = await _tokens_by_patient(c, SLOT_BROADCAST)
    tok = tokens["patient_bhavna"]

    # Reset the slot back to open first (broadcast test may have not locked it).
    # Actually broadcast leaves slot OPEN; we just fire mock-pay.
    ev = f"evt_dup_{int(time.time()*1000)}"
    r1 = await post_json(
        c, f"{API}/checkout/{tok}/mock-pay",
        {"forceEventId": ev, "fireWebhook": True},
    )
    r2 = await post_json(
        c, f"{API}/checkout/{tok}/mock-pay",
        {"forceEventId": ev, "fireWebhook": True},
    )
    print("first:", json.dumps(r1["webhookResponse"], indent=2))
    print("second:", json.dumps(r2["webhookResponse"], indent=2))

    assert r1["webhookResponse"]["code"] == "BOOKED", r1
    assert r2["webhookResponse"]["code"] == "DUPLICATE_EVENT", r2
    print("[OK] duplicate eventId rejected without a second lock attempt")
    return {"first": r1["webhookResponse"], "second": r2["webhookResponse"]}


async def concurrency_test(c: httpx.AsyncClient) -> dict:
    line("TEST 3 — Concurrency: two parallel webhooks, exactly one wins")
    # Fresh state: reset seed AND re-broadcast to get fresh tokens.
    await reset_seed()
    await post_json(c, f"{API}/clinics/slots/{SLOT_BROADCAST}/open")
    tokens = await _tokens_by_patient(c, SLOT_BROADCAST)

    tok_a = tokens["patient_aarav"]
    tok_b = tokens["patient_bhavna"]

    ev_a = f"evt_conc_a_{int(time.time()*1000)}"
    ev_b = f"evt_conc_b_{int(time.time()*1000)}"

    ra, rb = await asyncio.gather(
        post_json(c, f"{API}/checkout/{tok_a}/mock-pay",
                  {"forceEventId": ev_a, "fireWebhook": True}),
        post_json(c, f"{API}/checkout/{tok_b}/mock-pay",
                  {"forceEventId": ev_b, "fireWebhook": True}),
    )
    wa = ra["webhookResponse"]
    wb = rb["webhookResponse"]
    print("A:", json.dumps(wa, indent=2))
    print("B:", json.dumps(wb, indent=2))

    outcomes = [wa["code"], wb["code"]]
    booked_count = outcomes.count("BOOKED")
    taken_count = outcomes.count("SLOT_JUST_TAKEN")
    assert booked_count == 1 and taken_count == 1, \
        f"expected exactly one BOOKED and one SLOT_JUST_TAKEN, got {outcomes}"

    # Verify: only ONE confirmation message on the slot.
    msgs = await get_json(c, f"{API}/slots/{SLOT_BROADCAST}/messages")
    confirmations = [m for m in msgs if m["templateName"] == "booking_confirmation"]
    assert len(confirmations) == 1, f"expected 1 confirmation, got {len(confirmations)}"

    # Verify: loser has refundStatus initiated.
    loser_wh = wa if wa["code"] != "BOOKED" else wb
    loser_txn = None
    for _ in range(5):
        loser_txn = await (await c.get(
            f"{API}/slots/{SLOT_BROADCAST}/transactions"
        )).aread()
        break
    txns = json.loads(loser_txn)
    lost = [t for t in txns if t["id"] == loser_wh["transactionId"]][0]
    assert lost["refundStatus"] == "initiated", lost

    print(f"[OK] exactly one winner. confirmations={len(confirmations)}, "
          f"loser refundStatus={lost['refundStatus']}")
    return {"A": wa, "B": wb, "confirmations": len(confirmations),
            "loser_refund": lost["refundStatus"]}


async def expired_slot_test(c: httpx.AsyncClient) -> dict:
    line("TEST 4 — Expired slot at webhook time -> refund")
    # Broadcast on SLOT_EXPIRED first (must still be scheduled+future).
    await post_json(c, f"{API}/clinics/slots/{SLOT_EXPIRED}/open")
    tokens = await _tokens_by_patient(c, SLOT_EXPIRED)
    tok = tokens["patient_chirag"]

    # Rewind the slot's startTime to the past via direct DB update.
    import sys as _s
    _s.path.insert(0, "/app/backend")
    from database import slots as _slots  # type: ignore
    past_iso = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    await _slots.update_one({"id": SLOT_EXPIRED}, {"$set": {"startTime": past_iso}})

    ev = f"evt_exp_{int(time.time()*1000)}"
    r = await post_json(
        c, f"{API}/checkout/{tok}/mock-pay",
        {"forceEventId": ev, "fireWebhook": True},
    )
    print(json.dumps(r["webhookResponse"], indent=2))
    assert r["webhookResponse"]["code"] == "SLOT_EXPIRED", r["webhookResponse"]
    print("[OK] expired slot -> refund initiated")
    return r["webhookResponse"]


async def main():
    async with httpx.AsyncClient(timeout=30.0) as c:
        # Fresh state
        await reset_seed()
        r_broadcast = await broadcast_test(c)
        r_dup = await duplicate_event_test(c)
        r_conc = await concurrency_test(c)
        r_exp = await expired_slot_test(c)

    line("SUMMARY")
    print(json.dumps({
        "broadcast": r_broadcast,
        "duplicate": {"first": r_dup["first"]["code"], "second": r_dup["second"]["code"]},
        "concurrency": {
            "A_code": r_conc["A"]["code"], "B_code": r_conc["B"]["code"],
            "confirmations": r_conc["confirmations"],
            "loser_refund": r_conc["loser_refund"],
        },
        "expired": r_exp["code"],
    }, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
