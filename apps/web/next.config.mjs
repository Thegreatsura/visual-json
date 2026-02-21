import createMDX from "@next/mdx";

const withMDX = createMDX();

const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  serverExternalPackages: ["just-bash", "bash-tool"],
  transpilePackages: ["@visual-json/core", "@visual-json/react"],
};

export default withMDX(nextConfig);
