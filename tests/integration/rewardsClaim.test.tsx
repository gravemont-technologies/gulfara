import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Rewards from '@/pages/Rewards';
import { ThemeProvider } from '@/contexts/ThemeContext';

describe('Rewards integration', () => {
  test('allows claiming available voucher and shows confirmation modal', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <Rewards />
      </ThemeProvider>
    );

    const claimButtons = await screen.findAllByRole('button', { name: /Claim Voucher/i });
    await user.click(claimButtons[0]);

    const modalHeading = await screen.findByText(/Voucher Claimed!/i);
    expect(modalHeading).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Close/i }));
    expect(screen.queryByRole('button', { name: /Close/i })).not.toBeInTheDocument();
  });
});


