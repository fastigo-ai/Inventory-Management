export const LOCATION_HIERARCHY: Record<string, Record<string, string[]>> = {
  "Package 1(S/N)": {
    "Nahan": [],
    "Solan": ["Kumarhatti", "Nalagarh"]
  },
  "Package 2(R/R)": {
    "Rampur": [],
    "Rohru": []
  }
};

export const getAllPackages = () => Object.keys(LOCATION_HIERARCHY);

export const getCirclesForPackage = (pkg: string) => {
  return LOCATION_HIERARCHY[pkg] ? Object.keys(LOCATION_HIERARCHY[pkg]) : [];
};

export const getSubCircles = (pkg: string, circle: string) => {
  if (LOCATION_HIERARCHY[pkg] && LOCATION_HIERARCHY[pkg][circle]) {
    return LOCATION_HIERARCHY[pkg][circle];
  }
  return [];
};

// Utility to get the effective locations for a given user's circle assignment.
// If Solan is selected, it should ideally represent Solan + Kumarhatti + Nalagarh in backend queries.
export const getEffectiveLocations = (circle: string): string[] => {
  if (circle.toLowerCase() === 'solan') {
    return ['Solan', 'Kumarhatti', 'Nalagarh'];
  }
  return [circle];
};
