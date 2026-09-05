Desktop Print Dialog v113 Fixed

This build fixes the broken print patch from v112.

Fixed:
- Removed JavaScript text showing at the bottom of app screens.
- Removed broken raw script injection inside generated print HTML strings.
- Kept the existing Generate PDF format intact.
- Print now opens the generated PDF layout in a print window instead of printing the whole app screen.
- Applied the cleanup across all embedded modules.
