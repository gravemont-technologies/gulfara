import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';

function renderDashboard() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/app" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Dashboard integration', () => {
  test('renders quick stats from mock data', async () => {
    renderDashboard();

    expect(await screen.findByText('Total Cards')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText(/Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Today\'s Study Session/i)).toBeInTheDocument();
  });

  test('navigational CTA is present for practice session', async () => {
    renderDashboard();

    const cta = await screen.findByRole('button', { name: /Start Practice Session/i });
    expect(cta).toBeInTheDocument();
  });
});


