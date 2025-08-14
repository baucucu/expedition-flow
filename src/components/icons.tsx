import type { SVGProps } from "react";

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 17a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2z" fill="#64B5F6" />
      <path d="m18 9-2.43-2.43a2 2 0 0 0-2.83 0l-1.17 1.17a2 2 0 0 1-2.83 0L6 5" stroke="#3F51B5"/>
      <path d="M6 5h2" stroke="#3F51B5"/>
      <path d="m22 9-5-5" stroke="#3F51B5"/>
    </svg>
  );
}
