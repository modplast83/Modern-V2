import { useQuery } from "@tanstack/react-query";
import FactoryLogoPath from "../../../attached_assets/MPBF11_1769101097739.png";

export function useCompanyLogo() {
  const { data, isLoading } = useQuery<{ logo_url: string | null }>({
    queryKey: ["/api/company/logo"],
    staleTime: 5 * 60 * 1000,
  });

  const logoUrl = data?.logo_url || FactoryLogoPath;
  return { logoUrl, isLoading, fallbackLogo: FactoryLogoPath };
}
