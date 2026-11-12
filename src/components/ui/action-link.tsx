import type { AnchorHTMLAttributes, ReactNode } from "react";

type ActionLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "children" | "className"
> & {
  children: ReactNode;
  className?: string;
};

export function ActionLink({
  children,
  className,
  ...props
}: ActionLinkProps) {
  const classes = ["action-link", className].filter(Boolean).join(" ");

  return (
    <a className={classes} {...props}>
      {children}
    </a>
  );
}
