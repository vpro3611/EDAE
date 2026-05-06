import { privateApi, call } from './client'
import type { ReportConfigDto, ReportFrequency } from '../types'

export async function listReportConfigs(): Promise<ReportConfigDto[]> {
  return call(async () => {
    const { data } = await privateApi.get<{ report_configs: ReportConfigDto[] }>('/protected/report-configs')
    return data.report_configs
  })
}

export async function createReportConfig(payload: {
  connection_id: string
  frequency: ReportFrequency
  schedule_day: number
}): Promise<ReportConfigDto> {
  return call(async () => {
    const { data } = await privateApi.post<{ report_config: ReportConfigDto }>('/protected/report-configs', payload)
    return data.report_config
  })
}

export async function deleteReportConfig(id: string): Promise<void> {
  return call(async () => {
    await privateApi.delete(`/protected/report-configs/${id}`)
  })
}

export async function generateReport(report_config_id: string): Promise<void> {
  return call(async () => {
    await privateApi.post('/protected/reports/generate', { report_config_id })
  })
}
