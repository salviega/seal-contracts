import { Course } from '../models/course.model'

export function courseContractToCourse(courseContract: any[]): Course {
	const course: Course = {
		profileId: courseContract[0],
		attestationId: courseContract[1],
		courseId: courseContract[2],
		course: courseContract[3],
		adminRole: courseContract[4],
		managerRole: courseContract[5]
	}

	return course
}
