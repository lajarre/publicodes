import { Logger } from '.'
import { makeASTTransformer } from './AST'
import { ASTNode } from './AST/types'
import { InternalError, warning } from './error'
import { defaultNode } from './evaluation'
import parse from './parse'
import { Context } from './parsePublicodes'
import { ReferenceNode } from './reference'
import { Rule, RuleNode } from './rule'

export type ReplacementRule = {
	nodeKind: 'replacementRule'
	definitionRule: ASTNode & { nodeKind: 'reference' }
	replacedReference: ASTNode & { nodeKind: 'reference' }
	replacementNode: ASTNode
	whiteListedNames: Array<ASTNode & { nodeKind: 'reference' }>
	rawNode: any
	blackListedNames: Array<ASTNode & { nodeKind: 'reference' }>
	remplacementRuleId: number
}

// Replacements depend on the context and their evaluation implies using
// "variations" node everywhere there is a reference to the original rule.
// However for performance reason we want to mutualize identical "variations"
// nodes instead of duplicating them, to avoid wasteful computations.
//
// The implementation works by first attributing an identifier for each
// replacementRule. We then use this identifier to create a cache key that
// represents the combinaison of applicables replacements for a given reference.
// For example if replacements 12, 13 et 643 are applicable we use the key
// `12-13-643` as the cache identifier in the `inlineReplacements` function.
let remplacementRuleId = 0
const cache = {}

export function parseReplacements(
	replacements: Rule['remplace'],
	context: Context
): Array<ReplacementRule> {
	if (!replacements) {
		return []
	}
	// Circular references are a hacky escape hatch for cycle detection.
	// Replacement and "rend non applicable" nodes are defined in refeverse which
	// as the consequence of creating cycles if we follow reference naively.
	const markReferenceAsCircularContext = {
		...context,
		circularReferences: true,
	}
	return (Array.isArray(replacements) ? replacements : [replacements]).map(
		(replacement) => {
			if (typeof replacement === 'string') {
				replacement = { règle: replacement }
			}

			const replacedReference = parse(
				replacement.règle,
				markReferenceAsCircularContext
			)
			const replacementNode = parse(
				replacement.par ?? context.dottedName,
				markReferenceAsCircularContext
			)

			const [whiteListedNames, blackListedNames] = [
				replacement.dans ?? [],
				replacement['sauf dans'] ?? [],
			]
				.map((dottedName) =>
					Array.isArray(dottedName) ? dottedName : [dottedName]
				)
				.map((refs) =>
					refs.map((ref) => parse(ref, markReferenceAsCircularContext))
				)

			return {
				nodeKind: 'replacementRule',
				rawNode: replacement,
				definitionRule: parse(
					context.dottedName,
					markReferenceAsCircularContext
				),
				replacedReference,
				replacementNode,
				whiteListedNames,
				blackListedNames,
				remplacementRuleId: remplacementRuleId++,
			} as ReplacementRule
		}
	)
}

export function parseRendNonApplicable(
	rules: Rule['rend non applicable'],
	context: Context
): Array<ReplacementRule> {
	return parseReplacements(rules, context).map(
		(replacement) =>
			({
				...replacement,
				replacementNode: defaultNode(null),
			} as ReplacementRule)
	)
}

export function getReplacements(
	parsedRules: Record<string, RuleNode>
): Record<string, Array<ReplacementRule>> {
	return Object.values(parsedRules)
		.flatMap((rule) => rule.replacements)
		.reduce((acc, r: ReplacementRule) => {
			if (!r.replacedReference.dottedName) {
				throw new InternalError(r)
			}
			const key = r.replacedReference.dottedName
			return { ...acc, [key]: [...(acc[key] ?? []), r] }
		}, {})
}

export function inlineReplacements(
	replacements: Record<string, Array<ReplacementRule>>,
	logger: Logger
): (n: ASTNode) => ASTNode {
	return makeASTTransformer((node, transform) => {
		if (
			node.nodeKind === 'replacementRule' ||
			node.nodeKind === 'inversion' ||
			node.nodeKind === 'une possibilité'
		) {
			return false
		}
		if (node.nodeKind === 'recalcul') {
			// We don't replace references in recalcul keys
			return {
				...node,
				explanation: {
					...node.explanation,
					recalcul:
						node.explanation.recalcul && transform(node.explanation.recalcul),
					amendedSituation: node.explanation.amendedSituation.map(
						([name, value]) => [name, transform(value)]
					),
				},
			}
		}
		if (node.nodeKind === 'reference') {
			if (!node.dottedName) {
				throw new InternalError(node)
			}
			return replace(node, replacements[node.dottedName] ?? [], logger)
		}
	})
}

function replace(
	node: ASTNode & { nodeKind: 'reference' }, //& { dottedName: string },
	replacements: Array<ReplacementRule>,
	logger: Logger
): ASTNode {
	// TODO : handle transitivité

	const applicableReplacements = replacements
		.filter(
			({ definitionRule }) =>
				definitionRule.dottedName !== node.contextDottedName
		)
		.filter(
			({ whiteListedNames }) =>
				!whiteListedNames.length ||
				whiteListedNames.some((name) =>
					node.contextDottedName.startsWith(name.dottedName as string)
				)
		)
		.filter(
			({ blackListedNames }) =>
				!blackListedNames.length ||
				blackListedNames.every(
					(name) =>
						!node.contextDottedName.startsWith(name.dottedName as string)
				)
		)
		.sort((r1, r2) => {
			// Replacement with whitelist conditions have precedence over the others
			const criterion1 =
				+!!r2.whiteListedNames.length - +!!r1.whiteListedNames.length
			// Replacement with blacklist condition have precedence over the others
			const criterion2 =
				+!!r2.blackListedNames.length - +!!r1.blackListedNames.length
			return criterion1 || criterion2
		})
	if (!applicableReplacements.length) {
		return node
	}
	if (applicableReplacements.length > 1) {
		const displayVerboseWarning = false
		if (displayVerboseWarning) {
			warning(
				logger,
				node.contextDottedName,
				`
				Il existe plusieurs remplacements pour la référence '${node.dottedName}'.
				Lors de l'execution, ils seront résolus dans l'odre suivant :
				${applicableReplacements.map(
					(replacement) =>
						`\n\t- Celui définit dans la règle '${replacement.definitionRule.dottedName}'`
				)}
					`
			)
		}
	}

	const applicableReplacementsCacheKey = applicableReplacements
		.map((n) => n.remplacementRuleId)
		.join('-')

	cache[applicableReplacementsCacheKey] ??= {
		nodeKind: 'variations',
		visualisationKind: 'replacement',
		rawNode: node.rawNode,
		explanation: [
			...applicableReplacements.map((replacement) => ({
				condition: replacement.definitionRule,
				consequence: replacement.replacementNode,
			})),
			{
				condition: defaultNode(true),
				consequence: node,
			},
		],
	}
	return cache[applicableReplacementsCacheKey]
}
