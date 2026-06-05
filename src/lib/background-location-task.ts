import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_LOCATION_TASK = 'aniker-speedometer-location';

type LocationHandler = (location: Location.LocationObject) => void;

let locationHandler: LocationHandler | null = null;

export function setBackgroundLocationHandler(handler: LocationHandler | null) {
  locationHandler = handler;
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations?.length || !locationHandler) {
    return;
  }

  for (const location of locations) {
    locationHandler(location);
  }
});
