import { describe, expect, test } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      current-theme:{theme}
    </button>
  );
}

describe('ThemeContext', () => {
  test('provides default light theme and toggles to dark', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('current-theme:light');
    await user.click(button);
    await waitFor(() => expect(button).toHaveTextContent('current-theme:dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});


