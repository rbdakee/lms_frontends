/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Пакеты монорепо лежат исходниками, без сборки — Next компилирует их сам */
  transpilePackages: ["@lms/ui", "@lms/course", "@lms/site"],
};

export default nextConfig;
