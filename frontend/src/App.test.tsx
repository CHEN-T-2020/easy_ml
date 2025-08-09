import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders news classifier platform', () => {
  render(<App />);
  const titleElement = screen.getByText(/标题党识别训练平台/i);
  expect(titleElement).toBeInTheDocument();
});
