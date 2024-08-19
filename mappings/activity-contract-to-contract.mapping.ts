import { Activity } from '../models/activity.model'

export function activityContractToActivity(activityContract: any[]): Activity {
	const activity: Activity = {
		profileId: activityContract[0],
		attestationId: activityContract[1],
		activity: activityContract[2],
		credits: activityContract[3]
	}

	return activity
}
