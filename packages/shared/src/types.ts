export type Version = 'v3' | 'v4';

export interface Page {
  id?: number;
  url: string;
  version: Version;
  title: string;
  html: string;
  text: string;
  fetched_at: number;
  sha256: string;
}

export interface Component {
  id?: number;
  version: Version;
  tag: string; // canonical tag name like 'a-button'
  title: string;
  doc_url: string;
  aliases?: string; // JSON array of alternative names
}

export type ApiKind = 'props' | 'events' | 'slots' | 'methods';

export interface ApiItem {
  id?: number;
  version: Version;
  component_tag: string;
  kind: ApiKind;
  name: string;
  type?: string;
  required?: boolean;
  default_value?: string;
  description?: string;
  enum_values?: string; // JSON array of enum values
  since?: string;
  deprecated?: string;
  source_url: string;
}

export interface ComponentApi {
  component: Component;
  props: ApiItem[];
  events: ApiItem[];
  slots: ApiItem[];
  methods: ApiItem[];
}

export interface SearchResult {
  type: 'page' | 'api';
  title: string;
  snippet: string;
  url: string;
  version: Version;
}

// Utility functions for normalization
export function normalizeComponentTag(name: string): string {
  // Convert to lowercase and ensure it starts with 'a-'
  const lower = name.toLowerCase().trim();
  if (lower.startsWith('a-')) {
    return lower;
  }
  // Don't try to be smart about names starting with 'a' - just add 'a-' prefix
  return 'a-' + lower;
}

export function parseEnumValues(typeStr: string): string[] {
  if (!typeStr) return [];
  
  // Extract values from union types like 'small' | 'middle' | 'large'
  const matches = typeStr.match(/'([^']+)'|"([^"]+)"/g);
  if (matches) {
    return matches.map((m) => m.replace(/['"]/g, ''));
  }
  
  return [];
}

export function normalizeTableHeader(header: string): string {
  const lower = header.toLowerCase().trim();
  
  // Map Chinese and English headers to standard names
  const headerMap: Record<string, string> = {
    '参数': 'name',
    '属性': 'name',
    '名称': 'name',
    'property': 'name',
    'prop': 'name',
    'name': 'name',
    
    '说明': 'description',
    '描述': 'description',
    'description': 'description',
    
    '类型': 'type',
    'type': 'type',
    
    '默认值': 'default',
    '默认': 'default',
    'default': 'default',
    'default value': 'default',
    
    '必填': 'required',
    '必选': 'required',
    'required': 'required',
    
    '可选值': 'values',
    '可选项': 'values',
    'values': 'values',
    'options': 'values',
    
    '版本': 'since',
    'version': 'since',
    'since': 'since',
    
    '废弃': 'deprecated',
    'deprecated': 'deprecated',
    
    '事件名称': 'name',
    '事件': 'name',
    'event': 'name',
    'event name': 'name',
    
    '回调参数': 'type',
    'callback': 'type',
    'callback arguments': 'type',
    
    '插槽名': 'name',
    'slot': 'name',
    'slot name': 'name',
    
    '方法名': 'name',
    '方法': 'name',
    'method': 'name',
    'method name': 'name',
  };
  
  return headerMap[lower] || lower;
}
