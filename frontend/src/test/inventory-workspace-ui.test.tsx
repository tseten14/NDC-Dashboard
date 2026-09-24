import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SectorClassification from '@/pages/SectorClassification';
import { CountryProvider } from '@/context/CountryContext';
import { exerciseKey, readExercises } from '@/lib/inventory-workspace';
const show = () => render(<CountryProvider><SectorClassification /></CountryProvider>);
beforeEach(() => {
  const browser = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window;
  vi.stubGlobal('localStorage', browser.localStorage);
  localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('ndc-selected-country', 'UG');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('starts with exercises and resumes the saved classification for the named round', () => {
  const page = show();
  expect(screen.getByRole('heading', { name: 'Exercises' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'New exercise' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Exercise name' }), { target: { value: 'AFOLU 2025' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create exercise' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search sectors by name or code' }), { target: { value: '3.A.1' } });
  fireEvent.click(screen.getByRole('checkbox', { name: '3.A.1 Enteric Fermentation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save selection' }));
  expect(readExercises('UG')[0].selection.selectedCodes).toEqual(['3.A.1']);
  expect(readExercises('KE')).toEqual([]);
  page.unmount(); show();
  fireEvent.click(screen.getByRole('button', { name: /AFOLU 2025/ }));
  expect(screen.getByRole('button', { name: 'Review selection (1)' })).toBeInTheDocument();
});
it('preserves unreadable exercises and blocks writes rather than resetting the store', () => {
  localStorage.setItem(exerciseKey('UG'), '{broken json');
  show();
  expect(screen.getByRole('alert')).toHaveTextContent('Your stored data has not been changed');
  expect(screen.getByRole('button', { name: 'New exercise' })).toBeDisabled();
  expect(localStorage.getItem(exerciseKey('UG'))).toBe('{broken json');
});
it('keeps unsaved edits visible and recovers when browser storage becomes writable', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'New exercise' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Exercise name' }), { target: { value: 'Survey round' } });
  const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
  fireEvent.click(screen.getByRole('button', { name: 'Create exercise' }));
  expect(screen.getByRole('alert')).toHaveTextContent('browser storage could not save');
  expect(screen.getByText('Survey round')).toBeInTheDocument();
  blocked.mockRestore();
  fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(readExercises('UG')[0].name).toBe('Survey round');
});
it('does not overwrite changes made in another browser tab', () => {
  show();
  localStorage.setItem(exerciseKey('UG'), '[]');
  fireEvent.click(screen.getByRole('button', { name: 'New exercise' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Exercise name' }), { target: { value: 'Concurrent round' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create exercise' }));
  expect(screen.getByRole('alert')).toHaveTextContent('changed in another tab');
  expect(localStorage.getItem(exerciseKey('UG'))).toBe('[]');
});
