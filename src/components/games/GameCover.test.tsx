import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});