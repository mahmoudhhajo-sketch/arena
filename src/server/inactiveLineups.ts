const INACTIVE_WINDOW = 3 * 24 * 60 * 60 * 1000;

function latestTime(values: Array<string | Date | null | undefined>) {
  return values.reduce((latest, value) => Math.max(latest, value ? +new Date(value) : 0), 0);
}

/**
 * A manager-controlled club is considered unattended only when the manager has
 * neither logged in recently nor returned after the club's latest match.
 * Computer-controlled clubs always receive the safety lineup.
 */
export function shouldAutofillInactiveLineup(
  club: any,
  fixture: any,
  loginEvents: any[],
  playedMatches: any[],
) {
  if (club.isBot || !club.userId) return true;
  const fixtureTime = +new Date(fixture.date);
  const lastLogin = latestTime(
    loginEvents.filter((event) => event.userId === club.userId).map((event) => event.date),
  );
  const lastMatch = latestTime(
    playedMatches
      .filter(
        (match) =>
          (match.homeClubId === club.id || match.awayClubId === club.id) &&
          +new Date(match.playedAt) < fixtureTime,
      )
      .map((match) => match.playedAt),
  );
  const hasBeenAwayForDays = !lastLogin || fixtureTime - lastLogin >= INACTIVE_WINDOW;
  const hasNotReturnedSinceLastMatch = !lastMatch || !lastLogin || lastLogin <= lastMatch;
  return hasBeenAwayForDays && hasNotReturnedSinceLastMatch;
}

