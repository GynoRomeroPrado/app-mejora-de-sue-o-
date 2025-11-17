# Contributing to SleepWise

Thank you for considering contributing to SleepWise! This document provides guidelines and instructions for contributing to this project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Expected Behavior
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Git
- iOS Development: Xcode 14+
- Android Development: Android Studio

### Initial Setup

1. **Fork and Clone**
```bash
git clone https://github.com/YOUR_USERNAME/sleepwise.git
cd sleepwise
```

2. **Install Dependencies**
```bash
# Mobile
cd mobile && npm install

# Backend
cd ../backend && npm install

# ML
cd ../ml && pip install -r requirements.txt
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start Development Environment**
```bash
# Start all services
docker-compose up -d

# Run database migrations
cd backend/shared
npm run migrate:dev

# Seed database (optional)
npm run seed
```

5. **Start Development Servers**
```bash
# Mobile app
cd mobile
npm run ios  # or npm run android

# Backend services
cd backend
npm run dev

# ML service
cd ml
python inference/app.py
```

## Development Workflow

### Branching Strategy

We use **Git Flow** with the following branches:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `hotfix/*`: Urgent production fixes
- `release/*`: Release preparation

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

- Features: `feature/add-sleep-score-prediction`
- Bug fixes: `bugfix/fix-audio-recording-crash`
- Hotfixes: `hotfix/critical-auth-vulnerability`
- Documentation: `docs/update-api-documentation`

## Coding Standards

### TypeScript/JavaScript

**Style Guide**: We follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

**ESLint Configuration**:
```bash
npm run lint
npm run lint:fix
```

**Best Practices**:
- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use async/await over promises
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use meaningful variable names

**Example**:
```typescript
/**
 * Calculates the sleep score based on sleep phases and events
 * @param session - The sleep session to analyze
 * @returns Sleep score between 0-100
 */
export async function calculateSleepScore(
  session: SleepSession
): Promise<number> {
  const phaseScore = calculatePhaseScore(session.phases);
  const eventPenalty = calculateEventPenalty(session.events);

  return Math.max(0, Math.min(100, phaseScore - eventPenalty));
}
```

### Python

**Style Guide**: We follow [PEP 8](https://pep8.org/)

**Formatting**: Black
```bash
black ml/
```

**Linting**: Pylint, Flake8
```bash
pylint ml/
flake8 ml/
```

**Best Practices**:
- Use type hints
- Write docstrings (Google style)
- Keep functions pure when possible
- Use descriptive variable names
- Follow SOLID principles

**Example**:
```python
def preprocess_audio(
    audio_data: np.ndarray,
    sample_rate: int = 16000
) -> torch.Tensor:
    """
    Preprocesses raw audio for model input.

    Args:
        audio_data: Raw audio waveform as numpy array
        sample_rate: Audio sample rate in Hz

    Returns:
        Preprocessed audio tensor ready for model inference

    Raises:
        ValueError: If audio_data is empty or sample_rate is invalid
    """
    if len(audio_data) == 0:
        raise ValueError("Audio data cannot be empty")

    # Normalization
    audio_normalized = audio_data / np.max(np.abs(audio_data))

    # Convert to tensor
    return torch.from_numpy(audio_normalized).float()
```

### Database

**Prisma Schema**:
- Use descriptive model names (PascalCase)
- Add comments for complex fields
- Include indexes for frequently queried fields
- Use enums for fixed sets of values

**Migrations**:
```bash
# Create migration
npm run migrate:dev -- --name add_sleep_score_index

# Apply migration
npm run migrate
```

### Git Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD changes

**Examples**:
```bash
feat(mobile): add sleep score prediction screen

Implement the UI for displaying AI-powered sleep score predictions
with confidence intervals and recommendations.

Closes #123

---

fix(ml): resolve audio preprocessing memory leak

Fixed memory leak in audio feature extraction that occurred when
processing long audio files.

Fixes #456

---

docs(api): update authentication endpoint documentation

Added examples and error codes for login and registration endpoints.
```

## Testing

### Testing Philosophy
- Write tests for all new features
- Maintain >80% code coverage
- Test edge cases and error conditions
- Use meaningful test descriptions

### Mobile Testing

**Unit Tests (Jest)**:
```bash
cd mobile
npm test
```

**Integration Tests**:
```bash
npm run test:integration
```

**E2E Tests (Detox)**:
```bash
npm run test:e2e:ios
npm run test:e2e:android
```

**Example Test**:
```typescript
describe('SleepScoreCalculator', () => {
  it('should return 100 for perfect sleep', () => {
    const session = createMockSession({
      duration: 480, // 8 hours
      efficiency: 95,
      events: [],
    });

    const score = calculateSleepScore(session);
    expect(score).toBeGreaterThanOrEqual(95);
  });

  it('should penalize poor efficiency', () => {
    const session = createMockSession({
      duration: 480,
      efficiency: 60,
      events: [],
    });

    const score = calculateSleepScore(session);
    expect(score).toBeLessThan(70);
  });
});
```

### Backend Testing

**Unit Tests**:
```bash
cd backend
npm test
```

**Integration Tests**:
```bash
npm run test:integration
```

**API Tests (Supertest)**:
```typescript
describe('POST /api/v1/auth/login', () => {
  it('should return JWT token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

    expect(response.status).toBe(401);
  });
});
```

### ML Testing

**Model Tests (pytest)**:
```bash
cd ml
pytest tests/
```

**Example Test**:
```python
def test_audio_model_inference():
    """Test that audio model produces expected output shape."""
    model = SleepAnalysisModel()
    dummy_input = torch.randn(1, 1, 128, 1875)

    with torch.no_grad():
        outputs = model(dummy_input)

    assert 'sleep_phase' in outputs
    assert outputs['sleep_phase'].shape == (1, 1875, 4)

def test_preprocessing_normalization():
    """Test that audio preprocessing normalizes correctly."""
    audio = np.random.randn(16000)  # 1 second @ 16kHz
    processed = preprocess_audio(audio)

    assert processed.max() <= 1.0
    assert processed.min() >= -1.0
```

## Pull Request Process

### Before Submitting

1. **Self-Review**:
   - Review your own code first
   - Check for console.logs, debugger statements
   - Ensure all tests pass
   - Verify no linting errors

2. **Documentation**:
   - Update README if needed
   - Add/update JSDoc/docstrings
   - Update API documentation

3. **Testing**:
   - Write tests for new features
   - Ensure all tests pass
   - Check code coverage

### Creating a Pull Request

1. **Push Your Branch**:
```bash
git push origin feature/your-feature-name
```

2. **Open PR on GitHub**:
   - Use a clear, descriptive title
   - Fill out the PR template
   - Link related issues
   - Add screenshots/videos for UI changes
   - Request reviewers

3. **PR Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Dependent changes merged

## Related Issues
Closes #(issue number)
```

### Code Review Process

1. **Automated Checks**:
   - Linting
   - Tests
   - Code coverage
   - Build success

2. **Manual Review**:
   - At least 1 approval required
   - Address all review comments
   - Request re-review after changes

3. **Merge**:
   - Squash and merge for feature branches
   - Update CHANGELOG.md
   - Delete branch after merge

## Architecture Decisions

### When to Create an ADR

Create an Architecture Decision Record (ADR) for:
- Significant architectural changes
- Technology choices
- Design patterns
- Security decisions

### ADR Template

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[What is the issue that we're seeing that is motivating this decision?]

## Decision
[What is the change that we're proposing/doing?]

## Consequences
[What becomes easier or more difficult because of this change?]

## Alternatives Considered
[What other options were considered?]
```

## Performance Guidelines

### Mobile App
- Keep app bundle size < 50MB
- Minimize API calls (batch when possible)
- Implement proper caching
- Optimize images (WebP format)
- Use lazy loading for screens

### Backend
- API response time p95 < 200ms
- Database queries optimized (indexes)
- Use connection pooling
- Implement rate limiting
- Cache frequently accessed data

### ML Models
- Inference time < 30s per 5-min audio
- Model size < 50MB (mobile)
- Batch processing when possible
- GPU acceleration for training

## Security Guidelines

### General
- Never commit secrets (.env files)
- Use environment variables
- Implement proper authentication
- Validate all inputs
- Use HTTPS everywhere

### HIPAA Compliance
- Encrypt data at rest and in transit
- Implement audit logging
- Use role-based access control
- Regular security audits

### Data Privacy
- Minimize data collection
- Anonymize where possible
- User consent for data sharing
- Implement data deletion

## Documentation

### Code Documentation
- Add JSDoc/docstrings for public APIs
- Include examples in documentation
- Keep README files updated
- Document complex algorithms

### API Documentation
- Use OpenAPI/Swagger
- Include request/response examples
- Document error codes
- Keep versioned

## Questions?

- **General Questions**: Open a GitHub Discussion
- **Bug Reports**: Open a GitHub Issue
- **Security Issues**: Email security@sleepwise.app
- **Feature Requests**: Open a GitHub Issue with [Feature Request] tag

## License

By contributing to SleepWise, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to SleepWise! Your efforts help millions sleep better.** 💙
