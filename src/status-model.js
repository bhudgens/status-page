import { buildHistoryDays, rangesOverlap, toDate } from './dates.js';
import { normalizeIssuesToIncidents } from './incidents.js';

export function buildStatusModel({ config, issues, now = new Date() }) {
  const buildTime = toDate(now, 'now');
  const { incidents, warnings } = normalizeIssuesToIncidents(issues, config, { now: buildTime });
  const activeIncidents = incidents.filter((incident) => incident.state === 'open');
  const historyDays = buildHistoryDays(buildTime, config.site.historyDays);
  const historyStart = historyDays[0].start;
  const recentIncidents = incidents
    .filter((incident) => incident.state === 'closed')
    .filter((incident) => incident.windowEnd >= historyStart);

  const systems = config.systems.map((system) => {
    const activeForSystem = activeIncidents.filter((incident) => incident.systemIds.includes(system.id));
    const worst = worstIncident(activeForSystem);
    return {
      ...system,
      health: healthFromIncident(worst, config),
      active_incident_numbers: activeForSystem.map((incident) => incident.number),
      history: historyForScope({
        days: historyDays,
        incidents: incidents.filter((incident) => incident.systemIds.includes(system.id))
      })
    };
  });

  const overallWorst = worstIncident(activeIncidents);
  const overall = {
    state: activeIncidents.length === 0 ? 'operational' : 'incident',
    severity: overallWorst?.severity || null,
    display: overallWorst ? config.severities[overallWorst.severity].display : 'Operational',
    active_incident_numbers: activeIncidents.map((incident) => incident.number)
  };

  return {
    generated_at: buildTime.toISOString(),
    site: config.site,
    overall,
    categories: config.categories,
    systems,
    active_incidents: sortIncidents(activeIncidents).map(publicIncident),
    recent_incidents: sortIncidents(recentIncidents).map(publicIncident),
    history: {
      days: historyForScope({ days: historyDays, incidents })
    },
    warnings
  };
}

function historyForScope({ days, incidents }) {
  return days.map((day) => {
    const overlapping = incidents.filter((incident) =>
      rangesOverlap(incident.windowStart, incident.windowEnd, day.start, day.end)
    );
    const worst = worstIncident(overlapping);
    return {
      date: day.date,
      state: worst ? 'incident' : 'operational',
      severity: worst?.severity || null,
      incident_numbers: sortIncidents(overlapping).map((incident) => incident.number)
    };
  });
}

function worstIncident(incidents) {
  return sortIncidents(incidents)[0] || null;
}

export function sortIncidents(incidents) {
  return [...incidents].sort((a, b) => {
    if (b.severityRank !== a.severityRank) return b.severityRank - a.severityRank;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function healthFromIncident(incident, config) {
  if (!incident) {
    return {
      state: 'operational',
      severity: null,
      display: 'Operational'
    };
  }

  return {
    state: 'incident',
    severity: incident.severity,
    display: config.severities[incident.severity].display
  };
}

function publicIncident(incident) {
  return {
    number: incident.number,
    title: incident.title,
    url: incident.url,
    state: incident.state,
    status: incident.status,
    severity: incident.severity,
    system_ids: incident.systemIds,
    affects_global: incident.affectsGlobal,
    message: incident.message,
    created_at: incident.createdAt,
    updated_at: incident.updatedAt,
    closed_at: incident.closedAt
  };
}
