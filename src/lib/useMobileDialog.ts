import { useEffect, type RefObject } from 'react';

export function useMobileDialog(isOpen: boolean, dialogRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement;
    const mobile = window.matchMedia('(max-width: 1023px)');
    let release: (() => void) | undefined;
    let contained = false;

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault();
        first.focus();
      }
    };

    const updateContainment = () => {
      release?.();
      release = undefined;
      if (!mobile.matches) return;
      contained = true;
      const bodyOverflow = document.body.style.overflow;
      const rootOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      dialog.addEventListener('keydown', trapFocus);
      dialog.focus({ preventScroll: true });
      release = () => {
        document.body.style.overflow = bodyOverflow;
        document.documentElement.style.overflow = rootOverflow;
        dialog.removeEventListener('keydown', trapFocus);
      };
    };

    updateContainment();
    mobile.addEventListener('change', updateContainment);
    return () => {
      release?.();
      mobile.removeEventListener('change', updateContainment);
      if (contained && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen, dialogRef]);
}
