export interface NewsItem {
  id: string | number;
  rich_text: string;
  create_time: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: string;
}
