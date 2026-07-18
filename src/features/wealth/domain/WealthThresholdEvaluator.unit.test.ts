import { describe, expect, it } from "vitest";
import { WealthThresholdEvaluator } from "@/features/wealth/domain/WealthThresholdEvaluator";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";

const portfolioCalculator = new PortfolioCalculator();
const evaluator = new WealthThresholdEvaluator();

function derivedFrom(portfolio: Position[]) {
  return portfolioCalculator.derive(portfolio);
}

describe("WealthThresholdEvaluator", () => {
  it("should flag the emergency fund as below the minimum when liquidity falls short of it", () => {
    const cash: Position = { id: "cash", name: "Cuenta", ticker: "", type: "efectivo", units: 500, price: 1, group: "liquidez", equityIndex: null };
    const targets: WealthTargets = { ...WEALTH_TARGETS_INITIAL, minimumFund: 1000 };

    const status = evaluator.evaluate(derivedFrom([cash]), targets);

    expect(status.isEmergencyFundBelowMinimum).toBe(true);
    expect(status.isEmergencyFundComplete).toBe(false);
  });

  it("should flag the emergency fund as complete once liquidity reaches the target", () => {
    const cash: Position = { id: "cash", name: "Cuenta", ticker: "", type: "efectivo", units: 5000, price: 1, group: "liquidez", equityIndex: null };
    const targets: WealthTargets = { ...WEALTH_TARGETS_INITIAL, emergencyFund: 4900, minimumFund: 1000 };

    const status = evaluator.evaluate(derivedFrom([cash]), targets);

    expect(status.isEmergencyFundBelowMinimum).toBe(false);
    expect(status.isEmergencyFundComplete).toBe(true);
  });

  it("should flag the pause threshold when bitcoin weight and portfolio capital both exceed the pause limits", () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.3, price: 50000, group: "btc", equityIndex: null };
    const cash: Position = { id: "cash", name: "Cuenta", ticker: "", type: "efectivo", units: 12000, price: 1, group: "liquidez", equityIndex: null };
    const targets: WealthTargets = { ...WEALTH_TARGETS_INITIAL, btcPauseWeight: 40, btcPauseCapital: 10000, btcSellWeight: 90, btcSellCapital: 200000 };

    const status = evaluator.evaluate(derivedFrom([bitcoin, cash]), targets);

    expect(status.isBitcoinAtPauseThreshold).toBe(true);
    expect(status.isBitcoinAtSellThreshold).toBe(false);
  });

  it("should flag the sell threshold instead of the pause threshold once bitcoin crosses the sell limits", () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.5, price: 50000, group: "btc", equityIndex: null };
    const cash: Position = { id: "cash", name: "Cuenta", ticker: "", type: "efectivo", units: 5000, price: 1, group: "liquidez", equityIndex: null };
    const targets: WealthTargets = { ...WEALTH_TARGETS_INITIAL, btcPauseWeight: 40, btcPauseCapital: 10000, btcSellWeight: 50, btcSellCapital: 20000 };

    const status = evaluator.evaluate(derivedFrom([bitcoin, cash]), targets);

    expect(status.isBitcoinAtSellThreshold).toBe(true);
    expect(status.isBitcoinAtPauseThreshold).toBe(false);
  });

  it("should not flag any bitcoin threshold when the portfolio capital stays under the trigger amounts", () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.05, price: 50000, group: "btc", equityIndex: null };
    const targets: WealthTargets = { ...WEALTH_TARGETS_INITIAL, btcPauseWeight: 40, btcPauseCapital: 10000, btcSellWeight: 50, btcSellCapital: 20000 };

    const status = evaluator.evaluate(derivedFrom([bitcoin]), targets);

    expect(status.isBitcoinAtPauseThreshold).toBe(false);
    expect(status.isBitcoinAtSellThreshold).toBe(false);
  });

  it("should measure the world equity weight deviation from its target and flag it beyond the alert threshold", () => {
    const emergingFund: Position = { id: "fondo-em", name: "Fondo Emergentes", ticker: "EM.F", type: "fondo", units: 10, price: 20, group: "rv", equityIndex: "em" };
    const targets: WealthTargets = { ...WEALTH_TARGETS_INITIAL, equityTargets: { world: 60, em: 20, nasdaq: 20 } };

    const status = evaluator.evaluate(derivedFrom([emergingFund]), targets);

    expect(status.worldWeightDeviation).toBe(60);
    expect(status.isWorldWeightDeviated).toBe(true);
  });

  it("should not flag a world equity deviation when there is no equity exposure yet", () => {
    const status = evaluator.evaluate(derivedFrom([]), WEALTH_TARGETS_INITIAL);

    expect(status.isWorldWeightDeviated).toBe(false);
  });
});
