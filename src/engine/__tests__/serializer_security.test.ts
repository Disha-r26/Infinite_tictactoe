import { describe, expect, it } from 'vitest';
import {
  exportGameToJson,
  importGameFromJson,
  parseMoveString,
  reconstructFromMoves,
  sanitizeRules,
  MAX_MOVE_SEQUENCE_LENGTH,
  MAX_SERIALIZED_PAYLOAD_BYTES,
} from '../serializer';
import { applyMove, createInitialState } from '../state';
import { CellIndex } from '../types';

describe('Serializer & Input Hardening Security Audit', () => {
  describe('Payload Size & Resource Limits', () => {
    it('rejects JSON imports exceeding maximum payload limit (64 KB)', () => {
      const hugeJson = JSON.stringify({
        version: '1.0',
        padding: 'A'.repeat(MAX_SERIALIZED_PAYLOAD_BYTES + 100),
        moves: [],
      });

      const res = importGameFromJson(hugeJson);
      expect(res.state).toBeNull();
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors[0]).toMatch(/exceeds maximum allowed size/i);
    });

    it('rejects move sequences exceeding maximum allowed length (200 moves)', () => {
      const tooManyMoves = Array.from({ length: MAX_MOVE_SEQUENCE_LENGTH + 1 }, (_, i) => ({
        player: (i % 2 === 0 ? 'X' : 'O') as 'X' | 'O',
        cell: (i % 9) as CellIndex,
      }));

      const res = reconstructFromMoves(tooManyMoves);
      expect(res.state).toBeNull();
      expect(res.errors[0]).toMatch(/exceeds maximum allowed length/i);
    });

    it('bounds parseMoveString text length and number of parsed moves', () => {
      const massiveText = 'X: B2, '.repeat(500);
      const moves = parseMoveString(massiveText);
      expect(moves.length).toBeLessThanOrEqual(MAX_MOVE_SEQUENCE_LENGTH);
    });
  });

  describe('Malformed & Malicious JSON Handling', () => {
    it('handles empty string or non-string inputs gracefully without crashing', () => {
      expect(importGameFromJson('' as any).state).toBeNull();
      expect(importGameFromJson(null as any).state).toBeNull();
      expect(importGameFromJson(undefined as any).state).toBeNull();
    });

    it('handles truncated or invalid JSON syntax gracefully', () => {
      const brokenJson = '{"version": "1.0", "moves": [{"player": "X"';
      const res = importGameFromJson(brokenJson);
      expect(res.state).toBeNull();
      expect(res.errors[0]).toMatch(/JSON parse error/i);
    });

    it('rejects JSON payloads missing a moves array or containing non-array moves', () => {
      const noMoves = JSON.stringify({ version: '1.0' });
      expect(importGameFromJson(noMoves).state).toBeNull();

      const invalidMovesType = JSON.stringify({ version: '1.0', moves: 'invalid' });
      expect(importGameFromJson(invalidMovesType).state).toBeNull();
    });

    it('rejects invalid or out-of-range cell coordinates', () => {
      const badCells = [
        { player: 'X' as const, cell: 'Z9' },
        { player: 'X' as const, cell: -1 as any },
        { player: 'X' as const, cell: 99 as any },
      ];

      for (const bad of badCells) {
        const res = reconstructFromMoves([bad]);
        expect(res.state).toBeNull();
        expect(res.errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects invalid player symbols', () => {
      const badPlayer = [
        { player: 'HACKER' as any, cell: 'B2' },
      ];
      const res = reconstructFromMoves(badPlayer);
      expect(res.state).toBeNull();
      expect(res.errors[0]).toMatch(/Invalid player symbol/i);
    });
  });

  describe('Rules Sanitization & Prototype Pollution Protection', () => {
    it('sanitizes malicious or unexpected rule properties', () => {
      const maliciousRules = JSON.parse(
        '{"__proto__": {"polluted": true}, "maxMovesLimit": -99999, "winCheckTiming": "dangerous"}'
      );

      const safe = sanitizeRules(maliciousRules);
      expect((safe as any).polluted).toBeUndefined();
      expect(safe.maxMovesLimit).toBe(0); // clamped to 0..500
      expect(safe.winCheckTiming).toBeUndefined(); // invalid value ignored
    });

    it('clamps excessive maxMovesLimit to 500', () => {
      const safe = sanitizeRules({ maxMovesLimit: 1000000 });
      expect(safe.maxMovesLimit).toBe(500);
    });
  });

  describe('Clean Export/Import Round-Trip', () => {
    it('accurately exports and imports a multi-move game', () => {
      let state = createInitialState(undefined, 'X');
      state = applyMove(state, 4); // X: B2
      state = applyMove(state, 0); // O: A1
      state = applyMove(state, 1); // X: B1

      const json = exportGameToJson(state, 'X');
      const imported = importGameFromJson(json);

      expect(imported.errors).toHaveLength(0);
      expect(imported.state).not.toBeNull();
      expect(imported.userSymbol).toBe('X');
      expect(imported.state!.turn).toBe('O');
      expect(imported.state!.board[4]).toBe('X');
      expect(imported.state!.board[0]).toBe('O');
      expect(imported.state!.board[1]).toBe('X');
      expect(imported.state!.moveHistory).toHaveLength(3);
    });
  });
});
