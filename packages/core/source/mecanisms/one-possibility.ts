import { ASTNode } from '../AST/types'
import { registerEvaluationFunction } from '../evaluationFunctions'
import parse from '../parse'
import { Context } from '../parsePublicodes'

export type PossibilityNode = {
	explanation: Array<ASTNode>
	'choix obligatoire'?: 'oui' | 'non'
	context: string
	nodeKind: 'une possibilité'
}
// TODO : This isn't a real mecanism, cf. #963
export const mecanismOnePossibility = (v, context: Context) => {
	if (Array.isArray(v)) {
		v = {
			possibilités: v,
		}
	}
	return {
		...v,
		explanation: v.possibilités.map((p) =>
			parse(p, { ...context, circularReferences: true })
		),
		nodeKind: 'une possibilité',
		context: context.dottedName,
	} as PossibilityNode
}
registerEvaluationFunction<'une possibilité'>('une possibilité', (node) => ({
	...node,
	nodeValue: undefined,
	missingVariables: { [node.context]: 1 },
}))
