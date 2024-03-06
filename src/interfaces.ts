export interface IExtensionDeveloperInformation {
  extension_id: string;
  extension_name: string;
  developer_name: string | null;
  developer_website: string | null;
  developer_email: string | null;
  offered_by_name: string | null;
}

export interface IApiResponse {
  ignored_extension_ids: string[];
  matched_extension_data: IExtensionDeveloperInformation[];
  unmatched_extension_ids: string[];
}

export interface IChangelogEntry {
  timestamp: string;
  before: IExtensionDeveloperInformation;
  after: IExtensionDeveloperInformation;
}

export interface ILastUpdatedData {
  timestamp: string;
}