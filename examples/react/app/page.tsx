import { headers } from "next/headers";
import { Editor } from "./editor";

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export default async function Page() {
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? "";
  const isMobile = MOBILE_UA.test(ua);

  return <Editor defaultSidebarOpen={!isMobile} />;
}
