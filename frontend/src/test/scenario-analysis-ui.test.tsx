import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { CountryProvider } from '@/context/CountryContext';
import ScenarioAnalysis from '@/pages/ScenarioAnalysis';
import { readScenarios, scenarioKey } from '@/lib/scenario-analysis';
function show() { return render(<MemoryRouter><CountryProvider><ScenarioAnalysis /></CountryProvider></MemoryRouter>); }
beforeEach(() => {
  const browser = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window;
  vi.stubGlobal('localStorage', browser.localStorage); localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('ndc-selected-country', 'UG');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('starts separately from inventory and explains the missing reviewed basis', () => {
  show(); expect(screen.getByRole('heading', { name: 'Scenario Analysis' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'New scenario' }));
  expect(screen.getByRole('button', { name: 'Create scenario' })).toBeDisabled();
  expect(screen.getByText(/No inventory exercises are available/)).toBeInTheDocument();
});
it('does not overwrite unreadable scenario data', () => {
  localStorage.setItem(scenarioKey('UG'), '{broken'); show();
  expect(screen.getByRole('alert')).toHaveTextContent('No records have been changed');
  expect(screen.getByRole('button', { name: 'Explore a sample scenario' })).toBeDisabled();
  expect(localStorage.getItem(scenarioKey('UG'))).toBe('{broken');
});
it('keeps a sample scenario in memory when storage fails and retries without losing choices', () => {
  show(); const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  fireEvent.click(screen.getByRole('button', { name: 'Explore a sample scenario' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Browser storage could not save');
  expect(screen.getByRole('checkbox', { name: 'Feed quality and additives' })).toBeChecked();
  blocked.mockRestore(); fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument(); expect(readScenarios('UG')).toHaveLength(1); expect(readScenarios('KE')).toEqual([]);
});
it('preserves another tab’s stored records', () => {
  show(); localStorage.setItem(scenarioKey('UG'), '[]');
  fireEvent.click(screen.getByRole('button', { name: 'Explore a sample scenario' }));
  expect(screen.getByRole('alert')).toHaveTextContent('changed in another tab');
  expect(localStorage.getItem(scenarioKey('UG'))).toBe('[]');
});
