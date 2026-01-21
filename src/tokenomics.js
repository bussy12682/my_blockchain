/**
 * Tokenomics helper: design token specs, allocations, and genesis data
 */
class Tokenomics {
  constructor(name = 'MyToken', symbol = 'MTK', decimals = 18) {
    this.name = name;
    this.symbol = symbol;
    this.decimals = decimals;
    this.totalSupply = BigInt(0);
    this.allocations = [];
    this.metadata = { createdAt: Date.now() };
  }

  /**
   * Add an allocation: address -> amount
   */
  addAllocation(address, amount) {
    const amt = BigInt(amount);
    this.allocations.push({ address, amount: amt.toString() });
    this.totalSupply += amt;
    return this;
  }

  /**
   * Add multiple allocations at once
   */
  addAllocations(allocList) {
    for (const { address, amount } of allocList) {
      this.addAllocation(address, amount);
    }
    return this;
  }

  /**
   * Generate genesis block data object suitable for Block.genesis()
   */
  toGenesisData() {
    return {
      allocations: this.allocations,
      totalSupply: this.totalSupply.toString(),
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
      metadata: this.metadata
    };
  }

  /**
   * Export as JSON for archival/sharing
   */
  toJSON() {
    return {
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
      totalSupply: this.totalSupply.toString(),
      allocations: this.allocations,
      metadata: this.metadata
    };
  }

  /**
   * Load from JSON (useful for resuming a tokenomics design)
   */
  static fromJSON(obj) {
    const tok = new Tokenomics(obj.name, obj.symbol, obj.decimals);
    tok.totalSupply = BigInt(obj.totalSupply || 0);
    tok.allocations = obj.allocations || [];
    tok.metadata = obj.metadata || {};
    return tok;
  }
}

module.exports = Tokenomics;
