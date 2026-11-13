import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameCover } from './GameCover';

describe('GameCover', () => {
  it('uses product artwork and falls back to the branded cover when the image fails', () => {
    render(<GameCover slug="dixit" title="Dixit" coverUrl="https://assets.example/dixit.webp" />);

    const artwork = screen.getByRole('img', { name: 'Imagem da caixa ou componentes do jogo Dixit' });
    expect(artwork).toHaveAttribute('src', 'https://assets.example/dixit.webp');
    expect(artwork).toHaveClass('game-cover-real');

    fireEvent.error(artwork);

    const fallback = screen.getByRole('img', { name: /Capa ilustrada de Dixit/ });
    expect(fallback).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
    expect(fallback).not.toHaveClass('game-cover-real');
  });

  it('falls back when the cover already failed before React was listening (e.g. coming back to the page)', () => {
    const proto = HTMLImageElement.prototype;
    const complete = vi.spyOn(proto, 'complete', 'get').mockReturnValue(true);
    const width = vi.spyOn(proto, 'naturalWidth', 'get').mockReturnValue(0);
    try {
      render(<GameCover slug="dixit" title="Dixit" coverUrl="https://blocked.example/dixit.jpg" />);
      expect(screen.getByRole('img', { name: /Capa ilustrada de Dixit/ })).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
    } finally {
      complete.mockRestore();
      width.mockRestore();
    }
  });

  it('keeps a cover that is still loading', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
    try {
      render(<GameCover slug="dixit" title="Dixit" coverUrl="https://assets.example/dixit.webp" />);
      expect(screen.getByRole('img', { name: 'Imagem da caixa ou componentes do jogo Dixit' })).toHaveClass('game-cover-real');
    } finally {
      complete.mockRestore();
    }
  });
});