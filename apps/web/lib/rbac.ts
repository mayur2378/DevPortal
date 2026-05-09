type Session = { user: { role: string; id: string; email: string; name: string } } | null;

const ELEVATED = ["SUPERADMIN", "API_PRODUCT_OWNER", "API_DEVELOPER", "GOVERNANCE_REVIEWER", "SUPPORT_USER"];

export function hasRole(session: Session, role: string): boolean {
  if (!session?.user) return false;
  if (session.user.role === "SUPERADMIN") return true;
  return session.user.role === role;
}

export function canApproveRequests(session: Session): boolean {
  return hasRole(session, "API_PRODUCT_OWNER");
}

export function canReviewGovernance(session: Session): boolean {
  return hasRole(session, "GOVERNANCE_REVIEWER");
}

export function canPublishApis(session: Session): boolean {
  return hasRole(session, "API_DEVELOPER") || hasRole(session, "API_PRODUCT_OWNER");
}

export function isAdmin(session: Session): boolean {
  return session?.user?.role === "SUPERADMIN";
}

export function isElevatedRole(session: Session): boolean {
  if (!session?.user) return false;
  return ELEVATED.includes(session.user.role);
}
