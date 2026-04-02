import { EffectsChain } from './effects';

// Track connect calls to verify wiring order
const mockConnectCalls = [];
const mockConnect = jest.fn(function (target) {
  mockConnectCalls.push({ from: this._name, to: target._name });
  return target;
});

function mockMakeNode(name) {
  return { _name: name, connect: mockConnect, dispose: jest.fn(), gain: { value: 1 } };
}

jest.mock('tone', () => ({
  Gain: jest.fn((val) => ({ ...mockMakeNode(`Gain(${val})`), gain: { value: val } })),
  Chebyshev: jest.fn(() => mockMakeNode('Chebyshev')),
  Filter: jest.fn(() => mockMakeNode('Filter')),
  Reverb: jest.fn(() => mockMakeNode('Reverb')),
  Compressor: jest.fn(() => mockMakeNode('Compressor')),
  PingPongDelay: jest.fn(() => mockMakeNode('PingPongDelay')),
  Limiter: jest.fn(() => mockMakeNode('Limiter')),
}));

describe('EffectsChain', () => {
  beforeEach(() => {
    mockConnectCalls.length = 0;
    mockConnect.mockClear();
  });

  test('wires nodes in correct signal chain order', () => {
    const output = mockMakeNode('output');
    new EffectsChain(output);

    // Main chain: bus → saturation → tapeFilter → reverb → compressor → makeupGain → limiter → output
    const mainChain = mockConnectCalls.filter(
      (c) => !c.from.includes('PingPongDelay') && c.from !== 'Gain(0)',
    );
    const mainNames = mainChain.map((c) => c.from);

    expect(mainNames).toEqual([
      'Gain(1)',        // bus
      'Chebyshev',      // saturation
      'Filter',         // tapeFilter
      'Reverb',         // reverb
      'Compressor',     // compressor
      'Gain(2.5)',      // makeupGain
      'Limiter',        // limiter
    ]);
    // Last node connects to output
    expect(mainChain[mainChain.length - 1].to).toBe('output');
  });

  test('wires delay send as parallel path back to bus', () => {
    const output = mockMakeNode('output');
    new EffectsChain(output);

    const delayCalls = mockConnectCalls.filter(
      (c) => c.from === 'Gain(0)' || c.from === 'PingPongDelay',
    );
    expect(delayCalls).toEqual([
      { from: 'Gain(0)', to: 'PingPongDelay' },
      { from: 'PingPongDelay', to: 'Gain(1)' },
    ]);
  });

  test('dispose cleans up all nodes and nulls references', () => {
    const output = mockMakeNode('output');
    const chain = new EffectsChain(output);

    chain.dispose();

    expect(chain.bus).toBeNull();
    expect(chain.saturation).toBeNull();
    expect(chain.tapeFilter).toBeNull();
    expect(chain.reverb).toBeNull();
    expect(chain.compressor).toBeNull();
    expect(chain.makeupGain).toBeNull();
    expect(chain.limiter).toBeNull();
    expect(chain.delay).toBeNull();
    expect(chain.delaySend).toBeNull();
  });
});
