/**
 * Three-slider group. Live, controlled. No client-side math - the parent
 * receives values and computes what to display.
 */
export default function SliderGroup({ chairs, hourlyRate, cancellations, onChange }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <SliderRow
                testid="roi-slider-chairs"
                label="Chairs in your clinic"
                value={chairs}
                min={1}
                max={10}
                step={1}
                format={(v) => `${v} chair${v === 1 ? "" : "s"}`}
                onChange={(v) => onChange({ chairs: v, hourlyRate, cancellations })}
            />
            <SliderRow
                testid="roi-slider-hourly"
                label="Average hourly rate"
                value={hourlyRate}
                min={1000}
                max={5000}
                step={100}
                format={(v) => `₹${v.toLocaleString("en-IN")}/hr`}
                onChange={(v) => onChange({ chairs, hourlyRate: v, cancellations })}
            />
            <SliderRow
                testid="roi-slider-cancellations"
                label="Cancellations per week"
                value={cancellations}
                min={1}
                max={20}
                step={1}
                format={(v) => `${v} / week`}
                onChange={(v) => onChange({ chairs, hourlyRate, cancellations: v })}
            />
        </div>
    );
}

function SliderRow({ testid, label, value, min, max, step, format, onChange }) {
    return (
        <div>
            <div className="flex items-baseline justify-between mb-3">
                <div className="text-sm font-semibold opacity-80">{label}</div>
                <div className="mono text-lg font-semibold" data-testid={`${testid}-value`}>
                    {format(value)}
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                data-testid={testid}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-[var(--avsar-ink)]"
            />
            <div className="flex justify-between text-[11px] opacity-60 mt-1 mono">
                <span>{format(min)}</span>
                <span>{format(max)}</span>
            </div>
        </div>
    );
}
