from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation


def _parse_record_date(value):
    """Parse an ISO date or timestamp; return a date or None."""
    if not isinstance(value, str):
        return None

    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _valid_price(value):
    """Return a finite non-negative price as Decimal, or None."""
    if isinstance(value, bool) or value is None:
        return None

    try:
        price = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None

    if not price.is_finite() or price < 0:
        return None

    return price


def _number(value):
    """Convert Decimal to a JSON-friendly number."""
    return float(value) if value is not None else None


def _percent_change(previous, current):
    """Calculate percentage change; avoid division by zero."""
    if previous is None or current is None or previous == 0:
        return None

    return round(float((current - previous) / previous * Decimal("100")), 2)


def build_market_analytics(records, as_of=None, stale_after_days=7):
    """
    Summarize CEDA records without fetching data or changing source records.

    `as_of` is injectable for deterministic tests. Prices retain the provider's
    numeric units; this service does not assume a currency or quantity unit.
    """
    if as_of is None:
        as_of = datetime.now(timezone.utc).date()
    elif isinstance(as_of, datetime):
        as_of = as_of.date()

    if not isinstance(as_of, date):
        raise TypeError("as_of must be a date or datetime.")

    if isinstance(stale_after_days, bool) or not isinstance(stale_after_days, int):
        raise TypeError("stale_after_days must be an integer.")
    if stale_after_days < 0:
        raise ValueError("stale_after_days must be zero or greater.")

    daily_values = defaultdict(list)
    market_values = defaultdict(list)
    valid_dates = []
    invalid_records = 0

    for record in records or []:
        if not isinstance(record, dict):
            invalid_records += 1
            continue

        observed_date = _parse_record_date(record.get("date"))
        modal_price = _valid_price(record.get("modal_price"))

        if observed_date is None or modal_price is None:
            invalid_records += 1
            continue

        market_id = record.get("market_id")
        daily_values[observed_date].append(modal_price)
        market_values[market_id].append(
            (observed_date, modal_price)
        )
        valid_dates.append(observed_date)

    daily_trend = []
    for observed_date in sorted(daily_values):
        prices = daily_values[observed_date]
        mean_price = sum(prices, Decimal("0")) / len(prices)
        daily_trend.append({
            "date": observed_date.isoformat(),
            "average_modal_price": _number(mean_price),
            "records_count": len(prices),
        })

    previous_price = None
    for point in daily_trend:
        current = Decimal(str(point["average_modal_price"]))
        point["change_percent_from_previous_day"] = _percent_change(
            previous_price, current
        )
        previous_price = current

    latest_date = max(valid_dates) if valid_dates else None
    age_days = (as_of - latest_date).days if latest_date else None

    comparisons = []
    for market_id, observations in market_values.items():
        prices = [price for _, price in observations]
        latest_market_date = max(day for day, _ in observations)
        latest_market_prices = [
            price for day, price in observations
            if day == latest_market_date
        ]
        latest_market_average = (
            sum(latest_market_prices, Decimal("0"))
            / len(latest_market_prices)
        )
        period_average = sum(prices, Decimal("0")) / len(prices)

        comparisons.append({
            "market_id": market_id,
            "latest_observed_date": latest_market_date.isoformat(),
            "latest_average_modal_price": _number(latest_market_average),
            "period_average_modal_price": _number(period_average),
            "records_count": len(observations),
        })

    comparisons.sort(
        key=lambda item: (
            item["latest_average_modal_price"],
            str(item["market_id"]),
        )
    )

    first_price = (
        Decimal(str(daily_trend[0]["average_modal_price"]))
        if daily_trend else None
    )
    last_price = (
        Decimal(str(daily_trend[-1]["average_modal_price"]))
        if daily_trend else None
    )

    return {
        "status": "success",
        "data_available": bool(daily_trend),
        "summary": {
            "valid_records_count": len(valid_dates),
            "invalid_records_count": invalid_records,
            "markets_count": len(market_values),
            "first_observed_date": (
                min(valid_dates).isoformat() if valid_dates else None
            ),
            "latest_observed_date": (
                latest_date.isoformat() if latest_date else None
            ),
            "period_change_percent": _percent_change(first_price, last_price),
        },
        "freshness": {
            "as_of_date": as_of.isoformat(),
            "age_days": age_days,
            "stale_after_days": stale_after_days,
            "is_stale": age_days is None or age_days > stale_after_days,
            "label": (
                "No valid observations"
                if age_days is None
                else "Historical / stale data"
                if age_days > stale_after_days
                else "Recent observation; not a guarantee of live prices"
            ),
        },
        "daily_trend": daily_trend,
        "market_comparison": comparisons,
        "price_unit": "Not specified by this analytics service; verify provider metadata.",
    }
