"""A deterministic, didactic CAG model, NOT the paper's experiment or estimator.

Standard-library-only numerical reference for a TypeScript browser port.
Run: python tools/reference_model.py
Outputs fixtures/golden.json relative to this package. No network or training.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from pathlib import Path
import json
import math


@dataclass(frozen=True)
class Config:
    mode: str = "additive"
    baseline_drift: float = 1.0
    logging_drift: float = 1.0
    amplitude_drift: float = 0.0
    anchor: float = 0.5
    peak: float = 0.68
    exploration: float = 0.08
    logging_width: float = 0.13
    grid_size: int = 401
    periods: int = 7


def dot(x: list[float], y: list[float]) -> float:
    return math.fsum(u * v for u, v in zip(x, y))


def normalize(x: list[float]) -> list[float]:
    n = math.sqrt(dot(x, x))
    if n <= 1e-14:
        raise ValueError("No direction is defined for a zero-energy vector")
    return [v / n for v in x]


def raw_shape(a: float, config: Config) -> float:
    # The anchor is a reference, not the maximizer.
    return 4.0 * ((.5 - config.peak) ** 2 - (a - config.peak) ** 2)


def response(a: float, t: float, config: Config) -> float:
    s = 1.0 + config.amplitude_drift * (1.0 - 2.0 * t)
    r = raw_shape(a, config)
    if config.mode == "additive":
        return 6.0 + 2.5 * config.baseline_drift * (1.0 - 2.0 * t) + s * r
    return math.exp(1.2 + 0.6 * config.baseline_drift * (1.0 - 2.0 * t) + s * r)


def build(config: Config) -> dict:
    if config.mode not in {"additive", "log"}:
        raise ValueError("mode must be additive or log")
    if not (0 <= config.baseline_drift <= 1.2 and 0 <= config.logging_drift <= 1):
        raise ValueError("drift outside the supported teaching range")
    if not (0 <= config.amplitude_drift <= .45 and .25 <= config.anchor <= .75):
        raise ValueError("amplitude or anchor outside the teaching range")
    if not (0 < config.exploration < 1 and config.logging_width > 0):
        raise ValueError("positive exploration and width are required")
    if config.grid_size < 3 or config.periods < 2:
        raise ValueError("grid and period counts are too small")
    a = [j / (config.grid_size - 1) for j in range(config.grid_size)]
    w = [1.0 / (config.grid_size - 1)] * config.grid_size
    w[0] /= 2.0
    w[-1] /= 2.0
    times = [i / (config.periods - 1) for i in range(config.periods)]
    g = []
    m = []
    for t in times:
        center = .5 + .7 * config.logging_drift * (t - .5)
        kernel = [math.exp(-.5 * ((x - center) / config.logging_width) ** 2) for x in a]
        mass = dot(w, kernel)
        g.append([(1-config.exploration)*v/mass + config.exploration for v in kernel])
        m.append([response(x, t, config) for x in a])
    pooled = [sum(m[i][j] * g[i][j] for i in range(config.periods)) /
              sum(g[i][j] for i in range(config.periods)) for j in range(config.grid_size)]
    weights_given_action = [[g[i][j] / sum(g[k][j] for k in range(config.periods))
                             for j in range(config.grid_size)] for i in range(config.periods)]
    return {"actions": a, "quadrature": w, "times": times, "densities": g,
            "responses": m, "pooled": pooled, "period_weights": weights_given_action,
            "pooled_action": a[max(range(len(a)), key=pooled.__getitem__)]}


def geometry_fit(model: dict, config: Config, link: str) -> dict:
    """Numerical rank-one positive-amplitude profiling on known response curves.

    In this teaching family historical contrasts all have the same sign pattern.
    Hence their Gram matrix is nonnegative, and this power iteration selects the
    leading aligned direction. This is not a claimed general nonconvex optimizer
    and is NOT a cross-fitted observational estimator.
    """
    if link not in {"identity", "log"}:
        raise ValueError("unknown link")
    trans = (lambda v: v) if link == "identity" else math.log
    w = model["quadrature"]
    sw = [math.sqrt(v) for v in w]
    deltas = []
    for t, curve in zip(model["times"], model["responses"]):
        if link == "log" and min(curve) <= 0:
            raise ValueError("log link is invalid for this response")
        anchor_value = trans(response(config.anchor, t, config))
        deltas.append([trans(v) - anchor_value for v in curve])
    energies = [dot(w, [v*v for v in delta]) for delta in deltas]
    active = [i for i, en in enumerate(energies) if en > 1e-12]
    if not active:
        raise ValueError("No action signal: geometry is unidentified")
    z = [[deltas[i][j]*sw[j]/math.sqrt(energies[i]) for j in range(len(w))] for i in active]
    r = normalize([sum(row[j] for row in z) / len(z) for j in range(len(w))])
    for _ in range(600):
        scales = [max(0.0, dot(row, r)) for row in z]
        nxt = normalize([sum(scales[i]*z[i][j] for i in range(len(z))) / len(z)
                         for j in range(len(w))])
        err = math.sqrt(dot([x-y for x,y in zip(nxt,r)], [x-y for x,y in zip(nxt,r)]))
        r = nxt
        if err < 1e-12:
            break
    rho = [r[j]/sw[j] for j in range(len(w))]
    scale = [max(0.0, dot(w, [d*v for d,v in zip(delta,rho)])) for delta in deltas]
    losses = []
    for i in active:
        residual = [d-scale[i]*v for d,v in zip(deltas[i],rho)]
        losses.append(dot(w, [v*v for v in residual])/energies[i])
    return {"link": link, "rho": rho, "amplitudes": scale, "loss": sum(losses)/len(losses),
            "action": model["actions"][max(range(len(rho)), key=rho.__getitem__)]}


def future_audit(model: dict, config: Config, fit: dict, shock: float = 0.0) -> dict:
    """Future truth is for AFTER reveal only; never use it in historical fitting."""
    if not 0 <= shock <= 2.4:
        raise ValueError("shock outside supported range")
    a, w = model["actions"], model["quadrature"]
    true_link = "identity" if config.mode == "additive" else "log"
    linked = [(5.2 if true_link == "identity" else 1.0) + .9*raw_shape(x,config)
              - shock*(x-.5) for x in a]
    truth = linked if true_link == "identity" else [math.exp(v) for v in linked]
    chosen_link = fit["link"]
    trans = (lambda v: v) if chosen_link == "identity" else math.log
    baseline_linked = ((5.2 if true_link == "identity" else 1.0)
                       + .9*raw_shape(config.anchor, config) - shock*(config.anchor-.5))
    anchor_raw = baseline_linked if true_link == "identity" else math.exp(baseline_linked)
    delta = [trans(v) - trans(anchor_raw) for v in truth]
    rho = fit["rho"]
    sf = max(0.0, dot(w, [d*r for d,r in zip(delta,rho)]))
    residual = [d-sf*r for d,r in zip(delta,rho)]
    best = max(range(len(truth)), key=truth.__getitem__)
    cag = max(range(len(rho)), key=rho.__getitem__)
    pool = max(range(len(model["pooled"])), key=model["pooled"].__getitem__)
    return {"shock": shock, "oracle_action": a[best], "geometry_action": a[cag],
            "pooled_action": a[pool], "geometry_raw_regret": truth[best]-truth[cag],
            "pooled_raw_regret": truth[best]-truth[pool],
            "geometry_linked_regret": delta[best]-delta[cag],
            "twice_true_sup_residual": 2*max(abs(v) for v in residual)}


def summaries() -> dict:
    presets = {
        "additive_default": Config(),
        "no_baseline_drift": Config(baseline_drift=0),
        "no_logging_drift": Config(logging_drift=0),
        "log_with_amplitude_drift": Config(mode="log", amplitude_drift=.45),
        "pure_multiplicative_tie": Config(mode="log", amplitude_drift=0),
    }
    out = {"kind":"illustrative-not-paper-results", "version":1, "presets":{}}
    for name, cfg in presets.items():
        model = build(cfg)
        fits = {k: geometry_fit(model,cfg,k) for k in ("identity","log")}
        selected = min(fits, key=lambda k: fits[k]["loss"])
        gap = abs(fits["identity"]["loss"]-fits["log"]["loss"])
        tie = gap < 1e-8
        if tie:
            # Deterministic UI preference, NOT evidence of a unique link.
            selected = "identity"
        tests = [future_audit(model,cfg,fits[selected],eps) for eps in (0.0,1.2,2.4)]
        for row in tests:
            assert row["geometry_linked_regret"] <= row["twice_true_sup_residual"] + 1e-10
        out["presets"][name] = {"config":asdict(cfg), "pooled_action":model["pooled_action"],
            "identity_loss":fits["identity"]["loss"], "log_loss":fits["log"]["loss"],
            "identity_action":fits["identity"]["action"], "log_action":fits["log"]["action"],
            "selected_link":selected, "link_tie":tie, "future_audits":tests}
    assert .20 < out["presets"]["additive_default"]["pooled_action"] < .24
    assert abs(out["presets"]["no_baseline_drift"]["pooled_action"]-.68)<.003
    assert abs(out["presets"]["no_logging_drift"]["pooled_action"]-.68)<.003
    assert out["presets"]["additive_default"]["identity_loss"]<1e-10
    assert out["presets"]["log_with_amplitude_drift"]["log_loss"]<1e-10
    assert out["presets"]["log_with_amplitude_drift"]["identity_loss"]>1e-4
    assert out["presets"]["pure_multiplicative_tie"]["link_tie"]
    assert out["presets"]["additive_default"]["future_audits"][-1]["geometry_raw_regret"]>.3
    baseline_model = build(Config())
    for anchor in (.35, .65):
        cfg = Config(anchor=anchor)
        model = build(cfg)
        assert model["responses"] == baseline_model["responses"]
        assert model["pooled"] == baseline_model["pooled"]
        fit = geometry_fit(model,cfg,"identity")
        assert fit["loss"] < 1e-10 and abs(fit["action"]-.68)<.003
    return out


if __name__ == "__main__":
    out = summaries()
    target = Path(__file__).resolve().parents[1] / "fixtures" / "golden.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    for name, item in out["presets"].items():
        print(f"{name}: pooled={item['pooled_action']:.4f}, "
              f"identity loss={item['identity_loss']:.8g}, log loss={item['log_loss']:.8g}, "
              f"tie={item['link_tie']}")
    print("All numerical assertions passed. Wrote", target)
