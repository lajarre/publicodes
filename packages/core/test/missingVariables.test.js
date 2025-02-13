import { expect } from 'chai'
import Engine from '../source/index'
import yaml from 'yaml'

describe('Missing variables', function () {
	it('should identify missing variables in applicability', function () {
		const rawRules = {
			startHere: {
				formule: 2,
				'non applicable si': 'ko',
			},
			ko: {},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('startHere').missingVariables
		)

		expect(result).to.deep.equal(['ko'])
	})

	it('should identify missing variables in formulas', function () {
		const rawRules = {
			startHere: {
				formule: '2 + ko',
			},
			ko: {},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('startHere').missingVariables
		)

		expect(result).to.deep.equal(['ko'])
	})

	it('should identify missing variables along the namespace tree', function () {
		const rawRules = {
			startHere: {
				formule: 2,
				'non applicable si': 'evt . ko',
			},
			evt: {
				formule: { 'une possibilité': ['ko'] },
				titre: 'Truc',
				question: '?',
				'par défaut': 'oui',
			},
			'evt . ko': {},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('startHere').missingVariables
		)

		expect(result).to.deep.equal(['evt . ko', 'evt'])
	})

	it('should not identify missing variables from static rules', function () {
		const rawRules = {
			startHere: {
				formule: 2,
				'non applicable si': 'evt . welldefined . ko',
			},
			evt: 'oui',
			'evt . welldefined': {
				formule: 1 + 1,
				titre: 'Truc',
				question: '?',
			},
			'evt . welldefined . ko': {},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('startHere').missingVariables
		)

		expect(result).to.deep.equal(['evt . welldefined . ko'])
	})

	it('should identify missing variables mentioned in expressions', function () {
		const rawRules = {
			sum: 'oui',
			'sum . evt': 'oui',
			'sum . startHere': {
				formule: 2,
				'non applicable si': 'evt . nyet > evt . nope',
			},
			'sum . evt . nope': {},
			'sum . evt . nyet': {},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('sum . startHere').missingVariables
		)

		expect(result).to.include('sum . evt . nyet')
		expect(result).to.include('sum . evt . nope')
	})

	it('should ignore missing variables in the formula if not applicable', function () {
		const rawRules = {
			sum: 'oui',
			'sum . startHere': {
				formule: 'trois',
				'non applicable si': '3 > 2',
			},
			'sum . trois': {},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('sum . startHere').missingVariables
		)

		expect(result).to.be.empty
	})

	it('should not report missing variables when "one of these" short-circuits', function () {
		const rawRules = {
			sum: 'oui',
			'sum . startHere': {
				formule: 'trois',
				'non applicable si': {
					'une de ces conditions': ['3 > 2', 'trois'],
				},
			},
			'sum . trois': {},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('sum . startHere').missingVariables
		)

		expect(result).to.be.empty
	})

	it('should report "une possibilité" as a missing variable even though it has a formula', function () {
		const rawRules = {
			top: 'oui',
			ko: 'oui',
			'top . startHere': { formule: 'trois' },
			'top . trois': {
				formule: { 'une possibilité': ['ko'] },
			},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('top . startHere').missingVariables
		)

		expect(result).to.include('top . trois')
	})

	it('should not report missing variables when "une possibilité" is inapplicable', function () {
		const rawRules = {
			top: 'oui',
			ko: 'oui',
			'top . startHere': { formule: 'trois' },
			'top . trois': {
				formule: { 'une possibilité': ['ko'] },
				'non applicable si': 'oui',
			},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('top . startHere').missingVariables
		)

		expect(result).to.be.empty
		undefined
	})

	it('should not report missing variables when "une possibilité" was answered', function () {
		const rawRules = {
			top: 'oui',
			ko: 'oui',
			'top . startHere': { formule: 'trois' },
			'top . trois': {
				formule: { 'une possibilité': ['ko'] },
			},
		}
		const result = Object.keys(
			new Engine(rawRules)
				.setSituation({ 'top . trois': "'ko'" })
				.evaluate('top . startHere').missingVariables
		)

		expect(result).to.be.empty
	})

	it('should report missing variables in simple variations', function () {
		const rawRules = yaml.parse(`

somme: a + b
a: 10
b:
  formule:
    variations:
      - si: a > 100
        alors: c
      - sinon: 0
c:
  question: Alors ?`)
		const result = Object.keys(
			new Engine(rawRules).evaluate('somme').missingVariables
		)

		expect(result).to.have.lengthOf(0)
	})

	// TODO : réparer ce test
	it('should report missing variables in variations', function () {
		const rawRules = yaml.parse(`
startHere:
  formule:
    somme:
      - variations
variations:
  formule:
    variations:
      - si: dix
        alors:
          barème:
            assiette: 2008
            multiplicateur: deux
            tranches:
              - plafond: 1
                taux: 0.1
              - plafond: 2
                taux: trois
              - taux: 10
      - si: 3 > 4
        alors:
          barème:
            assiette: 2008
            multiplicateur: quatre
            tranches:
              - plafond: 1
                taux: 0.1
              - plafond: 2
                taux: 1.8
              - au-dessus de: 2
                taux: 10

dix: {}
deux: {}
trois: {}
quatre: {}

      `)
		const result = Object.keys(
			new Engine(rawRules).evaluate('startHere').missingVariables
		)

		expect(result).to.include('dix')
		expect(result).to.include('deux')
		expect(result).to.include('trois')
		expect(result).not.to.include('quatre')
	})
})

describe('nextSteps', function () {
	it('should generate questions for simple situations', function () {
		const rawRules = {
			top: 'oui',
			'top . sum': { formule: 'deux' },
			'top . deux': {
				'non applicable si': 'top . sum . evt',
				formule: 2,
			},
			'top . sum . evt': {
				titre: 'Truc',
				question: '?',
			},
		}

		const result = Object.keys(
			new Engine(rawRules).evaluate('top . sum').missingVariables
		)

		expect(result).to.have.lengthOf(1)
		expect(result[0]).to.equal('top . sum . evt')
	})
	it('should generate questions', function () {
		const rawRules = {
			top: 'oui',
			'top . sum': { formule: 'deux' },
			'top . deux': {
				formule: 'sum . evt',
			},
			'top . sum . evt': {
				question: '?',
			},
		}

		const result = Object.keys(
			new Engine(rawRules).evaluate('top . sum').missingVariables
		)

		expect(result).to.have.lengthOf(1)
		expect(result[0]).to.equal('top . sum . evt')
	})

	it('should generate questions with more intricate situation', function () {
		const rawRules = {
			top: 'oui',
			'top . sum': { formule: { somme: [2, 'deux'] } },
			'top . deux': {
				formule: 2,
				'non applicable si': "top . sum . evt = 'ko'",
			},
			'top . sum . evt': {
				formule: { 'une possibilité': ['ko'] },
				titre: 'Truc',
				question: '?',
			},
			'top . sum . evt . ko': {},
		}
		const result = Object.keys(
			new Engine(rawRules).evaluate('top . sum').missingVariables
		)

		expect(result).to.eql(['top . sum . evt'])
	})

	it("Parent's other descendands in sums should not be included as missing variables", function () {
		// See https://github.com/betagouv/publicodes/issues/33
		const rawRules = yaml.parse(`
transport:
  somme:
    - voiture
    - avion

transport . voiture:
  formule: empreinte * km

transport . voiture . empreinte: 0.12
transport . voiture . km:
  question: COMBIENKM
  par défaut: 1000

transport . avion:
  applicable si: usager
  formule: empreinte * km

transport . avion . km:
  question: COMBIENKM
  par défaut: 10000

transport . avion . empreinte: 0.300

transport . avion . usager:
  question: Prenez-vous l'avion ?
  par défaut: oui
`)
		const result = Object.keys(
			new Engine(rawRules).evaluate('transport . avion').missingVariables
		)

		expect(result).deep.to.equal([
			'transport . avion . km',
			'transport . avion . usager',
		])
	})

	it("Parent's other descendands in sums should not be included as missing variables, even when parent evluation is triggered by a comparison", function () {
		// See https://github.com/betagouv/publicodes/issues/33
		const rawRules = yaml.parse(`
transport:
  somme:
    - voiture
    - avion

transport . voiture:
  formule: empreinte * km

transport . voiture . gabarit:
  question: Quel gabarit ?
  par défaut: 2
transport . voiture . empreinte:
  formule:
    variations:
      - si: gabarit > 3
        alors: 800
      - sinon: 500
transport . voiture . km:
  question: COMBIENKM
  par défaut: 1000

transport . avion:
  applicable si: usager
  formule: empreinte * km

transport . avion . km:
  question: COMBIENKM
  par défaut: 10000

transport . avion . empreinte: 0.300

transport . avion . usager:
  question: Prenez-vous l'avion ?
  par défaut: oui
`)
		const result = Object.keys(
			new Engine(rawRules).evaluate('transport . voiture').missingVariables
		)

		expect(result).deep.to.equal([
			'transport . voiture . gabarit',
			'transport . voiture . km',
		])
	})
	it("Parent's other descendands in sums should not be included as missing variables - 2", function () {
		// See https://github.com/betagouv/publicodes/issues/33
		const rawRules = yaml.parse(`
avion:
  question: prenez-vous l'avion ?
  par défaut: oui

avion . impact:
  formule:
    somme:
      - au sol
      - en vol

avion . impact . en vol:
  question: Combien de temps passé en vol ?
  par défaut: 10

avion . impact . au sol: 5
`)
		const result = Object.keys(
			new Engine(rawRules).evaluate('avion . impact . au sol').missingVariables
		)

		expect(result).deep.to.equal(['avion'])
	})

	it("Parent's other descendands in sums in applicability should be included as missing variables", function () {
		// See https://github.com/betagouv/publicodes/issues/33
		const rawRules = yaml.parse(`
a:
  applicable si: d > 3
  valeur: oui

d:
 formule:
   somme:
     - e
     - 8

e:
  question: Vous venez à combien à la soirée ?
  par défaut: 3

a . b: 20 + 9
`)
		const result = Object.keys(
			new Engine(rawRules).evaluate('a . b').missingVariables
		)

		expect(result).deep.to.equal(['e'])
		expect(result).to.have.lengthOf(1)
	})
})
