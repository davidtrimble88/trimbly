import { createContext, useContext } from "react";

/** Whether the current user can actually use Garage pages, or is only
 * seeing the shell as a locked preview (set by GarageGate, read by
 * GarageLayout to decide whether to render the real Outlet or an
 * UpgradeGate card in its place). */
const GarageAccessContext = createContext<boolean>(true);

export const GarageAccessProvider = GarageAccessContext.Provider;

export function useGarageAccess() {
  return useContext(GarageAccessContext);
}
