import useSWR from "swr";
import api from "@/lib/api";

const DEFAULTS = {
  employment_status: ["KKWT", "KKWTT", "PBK", "PBT"],
  education_level: ["SD", "SMP", "SMA/SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3"],
  gender: ["Male", "Female"],
  movement_type: ["Promotion", "Mutation", "Demotion"],
  training_type: ["Certification", "Training"],
  training_organizer: ["PPRE", "External"],
};

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useOptions() {
  const { data } = useSWR("/options", fetcher);
  const get = (category) => {
    const list = data?.[category];
    if (list && list.length) return list.map((o) => o.value);
    return DEFAULTS[category] || [];
  };
  return { options: data || {}, get, raw: data };
}

export const OPTION_LABELS = {
  employment_status: "Employment Status",
  education_level: "Education Level",
  gender: "Gender",
  movement_type: "Movement Type",
  training_type: "Training Program Type",
  training_organizer: "Training Organizer",
};
