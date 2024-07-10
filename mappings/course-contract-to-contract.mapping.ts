import { Course } from '../models/course.model'

export function courseContractToCourse(courseContract: any[]): Course {
	const course: Course = {
		profileId: courseContract[0],
		attestationId: courseContract[1],
		course: courseContract[2],
		credits: courseContract[3]
	}

	return course
}
