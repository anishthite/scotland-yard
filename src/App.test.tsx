import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('application flow', () => {
  beforeEach(() => localStorage.clear())

  it('starts a fugitive game from the briefing screen', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { name: /city is a maze/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /begin pursuit/i }))
    expect((await screen.findAllByText(/choose a highlighted station|choose any connected/i)).length).toBeGreaterThan(0)
    expect(screen.getByText(/199 stations/i)).toBeInTheDocument()
  })

  it('opens the field manual', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /how to play/i }))
    expect(screen.getByRole('heading', { name: /how the pursuit works/i })).toBeInTheDocument()
  })
})
