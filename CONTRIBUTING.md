# Contributing to Avsar

Thank you for your interest in contributing to Avsar!

## Development Workflow
1. **Fork the repository** and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Setup your environment**:
   - Follow instructions in [SETUP.md](SETUP.md) for backend (FastAPI/Motor) and frontend (React/Tailwind).
   - Copy `.env.example` to `.env` in both `backend/` and `frontend/`.
3. **Commit your changes**:
   - Write clear, concise commit messages following standard conventions:
     ```bash
     git commit -m "feat(backend): add slot claim lock expiration timer"
     ```
4. **Push and Submit a Pull Request**:
   - Push to your branch and open a PR against `main`.

## Security & Secrets
- Never commit live API keys, `.env` files, or production database credentials.
- Ensure all input endpoints validate incoming payloads.
