import { EvaluationFunction } from '..'
import { ASTNode, EvaluatedNode } from '../AST/types'
import { convertToDate } from '../date'
import { warning } from '../error'
import { mergeAllMissing } from '../evaluation'
import { registerEvaluationFunction } from '../evaluationFunctions'
import { convertNodeToUnit } from '../nodeUnits'
import parse from '../parse'
import { inferUnit, serializeUnit } from '../units'

const knownOperations = {
	'*': [(a, b) => a * b, '×'],
	'/': [(a, b) => a / b, '∕'],
	'+': [(a, b) => a + b],
	'-': [(a, b) => a - b, '−'],
	'<': [(a, b) => a < b],
	'<=': [(a, b) => a <= b, '≤'],
	'>': [(a, b) => a > b],
	'>=': [(a, b) => a >= b, '≥'],
	'=': [(a, b) => a === b],
	'!=': [(a, b) => a !== b, '≠'],
} as const

export type OperationNode = {
	nodeKind: 'operation'
	explanation: [ASTNode, ASTNode]
	operationKind: keyof typeof knownOperations
	operator: string
}

const parseOperation = (k, symbol) => (v, context) => {
	const explanation = v.explanation.map((node) => parse(node, context))

	return {
		...v,
		nodeKind: 'operation',
		operationKind: k,
		operator: symbol || k,
		explanation,
	} as OperationNode
}

const evaluate: EvaluationFunction<'operation'> = function (node) {
	const explanation = node.explanation.map((node) => this.evaluate(node)) as [
		EvaluatedNode,
		EvaluatedNode
	]
	let [node1, node2] = explanation
	const missingVariables = mergeAllMissing([node1, node2])

	if (node1.nodeValue === undefined || node2.nodeValue === undefined) {
		return { ...node, nodeValue: undefined, explanation, missingVariables }
	}
	if (!['∕', '×'].includes(node.operator)) {
		try {
			if (node1.unit && 'unit' in node2) {
				node2 = convertNodeToUnit(node1.unit, node2)
			} else if (node2.unit) {
				node1 = convertNodeToUnit(node2.unit, node1)
			}
		} catch (e) {
			warning(
				this.options.logger,
				`Dans l'expression '${
					node.operator
				}', la partie gauche (unité: ${serializeUnit(
					node1.unit
				)}) n'est pas compatible avec la partie droite (unité: ${serializeUnit(
					node2.unit
				)})`,
				e
			)
		}
	}

	const operatorFunction = knownOperations[node.operationKind][0]

	const a = node1.nodeValue as string | boolean | null
	const b = node2.nodeValue as string | boolean | null

	const nodeValue =
		a === undefined || b === undefined
			? undefined
			: a === null ||
			  b === null ||
			  typeof a === 'boolean' ||
			  typeof b === 'boolean'
			? node.operator === '='
				? (a === null ? false : a) === (b === null ? false : b)
				: node.operator === '≠'
				? (a === null ? false : a) !== (b === null ? false : b)
				: ['*', '/', '+', '-'].includes(node.operator)
				? operatorFunction(a === null ? 0 : a, b === null ? 0 : b)
				: false
			: ['≠', '=', '<', '>', '≤', '≥'].includes(node.operator) &&
			  [a, b].every((value) =>
					(value as string).match?.(/[\d]{2}\/[\d]{2}\/[\d]{4}/)
			  )
			? operatorFunction(convertToDate(a), convertToDate(b))
			: operatorFunction(a, b)

	return {
		...node,
		explanation,
		...((node.operationKind === '*' ||
			node.operationKind === '/' ||
			node.operationKind === '-' ||
			node.operationKind === '+') && {
			unit: inferUnit(node.operationKind, [node1.unit, node2.unit]),
		}),
		missingVariables,
		nodeValue,
	}
}

registerEvaluationFunction('operation', evaluate)

const operationDispatch = Object.fromEntries(
	Object.entries(knownOperations).map(([k, [f, symbol]]) => [
		k,
		parseOperation(k, symbol),
	])
)

export default operationDispatch
