# Review: Reorder mobile Patrimonio (WealthTab) widgets

## Verdict: PASS

## Blocking findings
None.

## Warnings (non-blocking)
- `src/features/wealth/components/WealthTab.tsx:26,44,53,80` — Four `widget-*` classes are added but never referenced by any CSS rule: `widget-portfolio-score`, `widget-plan-status`, `widget-equity-targets`, `widget-fund-composition`. Only the four moved cards (`widget-onboarding-cta`, `widget-wealth-evolution`, `widget-wealth-distribution`, `widget-emergency-fund`) actually need a hook, since the "rest" stay at the default `order:0`. The unused classes are dead selectors and lean slightly against KISS/YAGNI (code-semantic §2). Harmless and arguably provide consistent semantic hooks, but if minimalism is preferred they could be dropped. Not blocking.
- `src/features/wealth/components/WealthTargetsOnboarding.tsx` — No test asserts the `className` passthrough. It's a trivial presentational prop, so a test is optional; the testing skill only warns on missing behavioral tests, and there's no business behavior change here.

## Positive points
- Correctness of the reorder is sound. `order` applies to CSS grid items (the container is `.grid`), and the negative-order scheme resolves to the requested mobile sequence: onboarding CTA (`-4`) → evolution (`-3`) → distribution (`-2`) → emergency fund (`-1`) → remaining cards (`0`, preserved in DOM order). Verified against DOM order in `WealthTab.tsx`.
- Desktop is genuinely untouched: all `order` rules live inside the existing `@media (max-width:760px)` block, so above 760px every card keeps the default `order:0`. No new media query, no cascade risk.
- The new media-query rules are appended to the already-existing `760px` block in the same single-line, inline style as the rest of `AppStyles.tsx` — stylistically coherent with the file. The `760px` breakpoint matches the stated "≤760px mobile" requirement.
- The `className?: string` optional prop is the correct React pattern: backwards-compatible (existing callers need no change), and the composition `` `card span-full${className ? ` ${className}` : ""}` `` correctly avoids a trailing space when the prop is absent or empty. The component keeps ownership of its base `card span-full` classes and only appends the caller's hook — clean contract, no breakage.
- Widget class names express intent (`widget-wealth-evolution`, `widget-emergency-fund`, etc.) rather than positional/technical shortcuts — consistent with code-semantic naming.
- No architectural boundary concerns: changes are confined to presentation (UI components + app-level styles). No domain/application/infrastructure coupling, no `any`, explicit return types preserved (`React.JSX.Element`), no `useEffect`-for-derived-state, no Law-of-Demeter chains introduced.

Relevant files reviewed:
- `src/features/wealth/components/WealthTab.tsx`
- `src/features/wealth/components/WealthTargetsOnboarding.tsx`
- `src/app/AppStyles.tsx`
