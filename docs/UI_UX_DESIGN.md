# SleepWise UI/UX Design System

## Design Philosophy

**Core Principles:**
1. **Sleep-First Design**: Dark mode by default, calming colors, minimal eye strain
2. **Trust & Security**: Clear data privacy indicators, transparent AI explanations
3. **Accessibility**: Large text, high contrast, simple navigation for elderly users
4. **Emotional Design**: Encouraging, supportive, never alarming
5. **Data Clarity**: Complex health data presented simply and actionably

## Color System

### Primary Palette (Dark Mode - Default)
```
Background: #0A0E27 (Deep Navy)
Surface: #151933 (Slightly Lighter)
Cards/Elevated: #1E2440
Primary Accent: #2196F3 (Calming Blue)
Secondary: #9C27B0 (REM Purple)
Success: #10B981 (Green)
Warning: #F59E0B (Amber)
Error: #EF4444 (Red)
```

### Sleep Phase Colors
```
Awake: #F44336 (Red)
REM: #9C27B0 (Purple)
Light Sleep: #42A5F5 (Light Blue)
Deep Sleep: #1565C0 (Deep Blue)
```

### Health Status Colors
```
Excellent: #4CAF50
Good: #8BC34A
Fair: #FFC107
Poor: #FF9800
Critical: #F44336
```

## Typography

### Font System
```
Heading 1: 36px, Bold (Page titles)
Heading 2: 30px, Semibold (Section titles)
Heading 3: 24px, Semibold (Card titles)
Body Large: 18px, Regular (Primary content)
Body: 16px, Regular (Standard text)
Body Small: 14px, Regular (Secondary info)
Caption: 12px, Regular (Metadata)
```

### Elderly-Friendly Adjustments
- Option to increase all text sizes by 125%
- High contrast mode (AAA rated)
- Clear line spacing (1.5x)
- No pure white text (reduces glare)

## Screen Designs

### 1. Home Dashboard
**Purpose**: At-a-glance sleep health overview

**Components:**
```
┌─────────────────────────────────────┐
│  Good Morning, Sarah   ☀️            │
│  Thursday, Nov 17                   │
├─────────────────────────────────────┤
│  Last Night's Sleep                 │
│  ┌─────────────────────────────┐   │
│  │    Sleep Score: 87          │   │
│  │    ───────────────────      │   │
│  │    Excellent! 🌟           │   │
│  │                             │   │
│  │    7h 45m  │  92%  │  4 REM│   │
│  │    Duration  Eff.    Cycles│   │
│  └─────────────────────────────┘   │
│                                     │
│  Sleep Timeline                     │
│  [Visual sleep phase chart]         │
│                                     │
│  Insights (2)                       │
│  💡 Your REM sleep improved 15%     │
│  ⚠️  Snoring detected: 12 events    │
│                                     │
│  [Start Sleep Session] button       │
└─────────────────────────────────────┘
```

**Key Features:**
- Large sleep score (trust signal)
- Visual sleep chart (intuitive understanding)
- Max 2-3 insights (prevent overwhelm)
- Clear CTA for recording

### 2. Sleep Recording Screen
**Purpose**: Simple, reassuring recording interface

**Components:**
```
┌─────────────────────────────────────┐
│  Recording Your Sleep               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │    [Pulsing Moon Icon]      │   │
│  │                             │   │
│  │    2h 14m                   │   │
│  │    Recording...             │   │
│  │                             │   │
│  │    🔋 Battery: 87%          │   │
│  │    📶 Phone muted          │   │
│  └─────────────────────────────┘   │
│                                     │
│  Tips:                              │
│  • Place phone on nightstand        │
│  • Keep it plugged in               │
│  • Your privacy is protected 🔒     │
│                                     │
│  [Stop Recording] button            │
└─────────────────────────────────────┘
```

**Key Features:**
- Minimal UI (dark, no bright elements)
- Battery indicator (prevent dead phone)
- Privacy reassurance
- Large stop button (easy to find when groggy)

### 3. Sleep Analysis Details
**Purpose**: Deep dive into single night's sleep

**Components:**
```
┌─────────────────────────────────────┐
│  ← Tuesday, Nov 15                  │
├─────────────────────────────────────┤
│  Sleep Score: 87                    │
│  [Circular progress indicator]      │
│                                     │
│  Duration: 7h 45m                   │
│  Efficiency: 92%                    │
│  Time to Sleep: 12 min              │
│  Awakenings: 2                      │
│                                     │
│  Sleep Phases                       │
│  [Detailed timeline chart]          │
│  [Phase distribution pie chart]     │
│                                     │
│  Awake:  15m (3%)                   │
│  REM:    1h 45m (23%)               │
│  Light:  3h 30m (45%)               │
│  Deep:   2h 15m (29%)               │
│                                     │
│  Events (14)                        │
│  🔇 Snoring: 12 events              │
│  😴 Awakenings: 2 events            │
│                                     │
│  AI Insights                        │
│  💡 Your deep sleep was 15% above  │
│     your average. Great recovery!  │
│                                     │
│  [Compare] [Export] [Delete]        │
└─────────────────────────────────────┘
```

**Key Features:**
- Progressive disclosure (summary → details)
- Visual data representations
- Actionable insights
- Export functionality

### 4. Trends & Analytics
**Purpose**: Long-term pattern visualization

**Components:**
```
┌─────────────────────────────────────┐
│  Sleep Trends                       │
│  [Week] [Month] [Year] tabs         │
├─────────────────────────────────────┤
│  This Month                         │
│                                     │
│  Average Sleep Score: 84            │
│  [Line chart showing trend ↗]       │
│                                     │
│  Sleep Duration                     │
│  [Bar chart by day of week]         │
│  Avg: 7h 32m                        │
│                                     │
│  Sleep Efficiency                   │
│  [Area chart over time]             │
│  Avg: 89%                           │
│                                     │
│  Phase Distribution                 │
│  [Stacked bar chart]                │
│                                     │
│  Patterns Detected                  │
│  📊 You sleep better on weekends    │
│  📊 Bedtime consistency: Good       │
│  📊 Weekend recovery: Moderate      │
│                                     │
│  AI Predictions                     │
│  🔮 Tonight's predicted score: 86   │
│     (Based on recent patterns)      │
└─────────────────────────────────────┘
```

**Key Features:**
- Multiple time periods
- Clear averages
- Trend indicators (↗↘→)
- Pattern recognition
- Predictions with explanations

### 5. Family Dashboard
**Purpose**: Monitor family members' sleep health

**Components:**
```
┌─────────────────────────────────────┐
│  Family Sleep Health                │
├─────────────────────────────────────┤
│  Mom (Linda, 68)                    │
│  ┌─────────────────────────────┐   │
│  │  Last Night: 82              │   │
│  │  6h 45m  │  88%  │  Normal   │   │
│  │  ⚠️ 3 apnea-like events      │   │
│  │  [View Details →]            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Dad (Robert, 70)                   │
│  ┌─────────────────────────────┐   │
│  │  Last Night: 78              │   │
│  │  6h 12m  │  85%  │  Fair     │   │
│  │  💡 Sleep improving this week│   │
│  │  [View Details →]            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Alerts (1)                         │
│  ⚠️ Mom's apnea events increased    │
│     by 40% this week. Consider      │
│     consulting a doctor.            │
│     [Dismiss] [Contact Mom]         │
│                                     │
│  [Add Family Member] button         │
└─────────────────────────────────────┘
```

**Key Features:**
- At-a-glance family overview
- Health alerts (non-alarming)
- Quick communication
- Privacy-respecting (summary only by default)

### 6. Settings & Privacy
**Purpose**: Control over data and app behavior

**Components:**
```
┌─────────────────────────────────────┐
│  Settings                           │
├─────────────────────────────────────┤
│  Account                            │
│  → Profile & Subscription           │
│  → Notifications                    │
│                                     │
│  Sleep Tracking                     │
│  → Audio Quality: Medium            │
│  → Smart Alarm Settings             │
│  → Integrations (HealthKit, etc.)   │
│                                     │
│  Privacy & Security 🔒              │
│  → Data Privacy                     │
│  → Family Sharing Permissions       │
│  → Download My Data                 │
│  → Delete Account                   │
│                                     │
│  Appearance                         │
│  → Theme: Dark (recommended)        │
│  → Text Size: Large                 │
│  → Color Blind Mode                 │
│                                     │
│  About                              │
│  → Help & Support                   │
│  → Privacy Policy                   │
│  → Terms of Service                 │
└─────────────────────────────────────┘
```

**Key Features:**
- Clear privacy controls
- Data export (GDPR compliance)
- Accessibility options
- Easy support access

## Key User Flows

### Onboarding Flow
1. **Welcome Screen**: Value proposition, privacy promise
2. **Permissions**: Microphone access (with clear explanation)
3. **Profile Setup**: Age, health goals, sleep concerns
4. **Trial Offer**: 7-day free premium trial
5. **First Recording**: Guided setup with tips

### Recording Flow
1. **Preparation**: Checklist (phone placement, charging, silence)
2. **Start Recording**: One-tap start, confirmation
3. **During Sleep**: Minimal UI, battery monitoring
4. **Wake Up**: Gentle stop, processing indicator
5. **Results**: Sleep score, insights, share option

### Subscription Flow
1. **Feature Limitation**: Gentle prompt when accessing premium features
2. **Pricing Comparison**: Clear tier comparison table
3. **Benefits Highlight**: What they get with premium
4. **Payment**: Stripe integration, secure
5. **Confirmation**: Welcome to premium, feature walkthrough

## Accessibility Features

### For Elderly Users
- **Large Text Mode**: 125% scaling
- **High Contrast**: WCAG AAA compliant
- **Simple Navigation**: Max 3 taps to any feature
- **Voice Feedback**: Optional TTS for all screens
- **Haptic Feedback**: Physical confirmation of actions

### For Visual Impairments
- **Screen Reader Support**: Full VoiceOver/TalkBack
- **Color Blind Safe**: Patterns + colors for all charts
- **Adjustable Contrast**: Multiple levels
- **Large Touch Targets**: Minimum 44x44pt

### For Hearing Impairments
- **Visual Alerts**: All audio notifications have visual equivalent
- **Vibration Patterns**: Different patterns for different alerts

## Animation & Motion

### Principles
- **Purposeful**: Every animation serves a function
- **Smooth**: 60fps, easing curves
- **Respectful**: Reduce motion option
- **Delightful**: Subtle celebrations for achievements

### Key Animations
- Sleep score reveal: Counting animation
- Phase transitions: Smooth color morphing
- Loading states: Gentle pulsing
- Success states: Confetti (opt-in)

## Error States & Empty States

### Error Messages
- **Friendly Tone**: "Oops!" not "ERROR"
- **Actionable**: Always provide next steps
- **Reassuring**: Data safety emphasized
- **Examples**:
  - "No audio detected. Make sure your phone isn't muted."
  - "Network hiccup! Your data is safe. We'll try again."

### Empty States
- **Encouraging**: Not discouraging
- **Actionable**: Clear next steps
- **Visual**: Illustration + text
- **Examples**:
  - First session: "Your first night awaits! Tap below to start."
  - No family: "Invite family members to share health insights."

## Notifications

### Types
1. **Actionable**: "Time for bed! Your optimal sleep window is now."
2. **Informative**: "Your sleep score improved 10% this week!"
3. **Alerts**: "Mom's sleep pattern changed. Check in?"
4. **Reminders**: "Don't forget to record tonight's sleep."

### Guidelines
- **Timing**: Never between 10 PM - 7 AM (unless emergency)
- **Frequency**: Max 2 per day (unless alert)
- **Personalization**: Based on user's schedule
- **Opt-out**: Easy to disable by category

## Design System Implementation

### Component Library
- Buttons (primary, secondary, text)
- Cards (info, stat, insight)
- Charts (line, bar, pie, timeline)
- Inputs (text, number, date, time)
- Modals (confirmation, info, alert)
- Navigation (bottom tabs, stack headers)

### Spacing System
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### Responsive Design
- Phone: Optimized for 375-428px width
- Tablet: Adaptive layout for 768px+
- Landscape: Optimized layouts
- Foldables: Flex layout support

## Prototyping Tools

- **Design**: Figma
- **Prototyping**: Figma + React Native Paper
- **User Testing**: Maze, UserTesting.com
- **Analytics**: Mixpanel, Amplitude

## Success Metrics

### User Experience
- Time to first recording: < 5 minutes
- Task completion rate: > 90%
- User satisfaction (NPS): > 50
- Accessibility compliance: WCAG 2.1 AAA

### Engagement
- Daily active users: 60%+ (of total users)
- Average sessions per week: 5+
- Premium conversion: 5%+
- Retention (30-day): 70%+

## Future Enhancements

1. **AR Sleep Environment**: Scan bedroom for optimization tips
2. **Voice Assistant**: "Hey SleepWise, how did I sleep?"
3. **Apple Watch App**: Complementary tracking
4. **Smart Home Integration**: Auto-adjust lights, temp
5. **Social Features**: Anonymous sleep challenges
