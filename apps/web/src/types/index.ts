export * from "@omnimedix/shared";

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  roles?: string[];
  badge?: string | number;
}
