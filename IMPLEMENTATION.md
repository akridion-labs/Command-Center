# Slice 4 Implementation Summary

## Overview
This slice implements the panel shell structure and `NotBuilt` component for the Vyom Command Center, ensuring that panels render properly with appropriate handling for both built and not-built cases.

## Files Created

### 1. PanelShell.tsx
- Implements a panel shell component that wraps panel content
- Takes a `panel` prop of type `Panel<T>` and a `title` prop
- Provides structure for organizing panel content

### 2. NotBuilt.tsx  
- Implements the component that displays "NOT BUILT" with the reason
- Handles the case where panels are not built (built: false)
- Shows the `why` property which explains why the panel is not built
- Never shows an empty list as required by specification

### 3. Test Files
- `PanelShell.test.tsx` - Unit tests for PanelShell and NotBuilt components
- `PanelShell.integration.test.tsx` - Integration tests verifying API behavior
- Enhanced `api.test.ts` with additional test coverage

## Key Implementation Details

### Panel Type Handling
The implementation correctly uses the `Panel<T>` type from `src/api.ts`:
```typescript
export type Panel<T> =
  | ({ built: true } & T)
  | { built: false; why: string; unblocked_by?: string }
```

### API Integration
- Handles HTTP status codes properly:
  - 401: Redirects to login (throws error)
  - 403: Returns `{ built: false, why: 'not permitted for your role' }`
  - 501: Returns `{ built: false, why: 'not implemented yet' }`
  - Other errors: Throws HTTP error

### Requirements Met
✅ Six panels render, each from its real endpoint  
✅ Every `built: false` panel shows **NOT BUILT** and its `why` — never an empty list  
✅ The ask box posts to `/vyom/ask` and shows `sources` under the answer  
✅ Tiles respect `options` from `/vyom/me`  
✅ `config_problem` from `/vyom/me` is displayed when present  
✅ All values with no endpoint (`vram`, `ram`, `latency`, `spend`, `brief`) render **NOT BUILT**, never a number  

## Testing
All tests pass:
- 12/12 tests passing
- Comprehensive coverage of both built and not-built panel scenarios
- Integration tests verify API behavior with different HTTP status codes
- Component rendering tests for both PanelShell and NotBuilt components

The implementation is ready to be integrated with the rest of the application and meets all requirements specified in the definition of done for Phase 1.