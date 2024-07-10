import { DataLocation } from '../constants/enums'

export interface Schema {
	id?: number
	registrant: string
	revocale: boolean
	dataLocation: DataLocation
	maxValidFor: number
	hook: string
	timestamp: number
	data: string
}
