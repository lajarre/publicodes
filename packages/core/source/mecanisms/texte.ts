import parse from '../parse'
import { registerEvaluationFunction } from '../evaluationFunctions'
import { ASTNode, formatValue, parsePublicodes } from '..'
import { mergeAllMissing } from '../evaluation'

const NAME = 'texte' as const

export type TexteNode = {
	explanation: Array<ASTNode | string>
	nodeKind: typeof NAME
}

export default function parseTexte(texte: string, context): TexteNode {
	const explanation = [] as TexteNode['explanation']
	let lastIndex = 0
	for (const { 0: expression, index } of texte.matchAll(/{{(.|\n)*?}}/g)) {
		const publicodeExpression = expression.slice(2, -2).trim()
		const parsedNode = parse(publicodeExpression, context)
		explanation.push(texte.substring(lastIndex, index), parsedNode)
		lastIndex = (index ?? 0) + expression.length
	}
	explanation.push(texte.slice(lastIndex))
	return {
		nodeKind: NAME,
		explanation,
	}
}
parseTexte.nom = NAME

registerEvaluationFunction(NAME, function evaluate(node) {
	const explanation = node.explanation.map((element) =>
		typeof element === 'string' ? element : this.evaluate(element)
	)
	const missingVariables = mergeAllMissing(
		node.explanation.filter(
			(element) => typeof element !== 'string'
		) as Array<ASTNode>
	)

	return {
		...node,
		explanation,
		missingVariables,
		nodeValue: explanation
			.map((element) =>
				typeof element === 'string' ? element : formatValue(element)
			)
			.join(''),
	}
})
