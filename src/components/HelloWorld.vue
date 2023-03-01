<template>
  <v-container>
    <v-row class="text-center">
      <v-col cols="12">
        <v-img
          :src="require('../assets/logo.svg')"
          class="my-3"
          contain
          height="200"
        />
      </v-col>

      <v-col class="mb-4">
        <h1 class="display-2 font-weight-bold mb-3">Welcome to Alles-IT</h1>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'HelloWorld',

  data: () => ({
    exchangeRate: null,
    ecosystem: [],
  }),
  // methods
  methods: {
    async getExchangeRate(fromCurrency, toCurrency) {
      try {
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
        )
        if (!response.ok) {
          throw new Error(
            `Unable to fetch exchange rates. Response status: ${response.status}`
          )
        }
        const exchangeRates = await response.json()
        if (!exchangeRates.rates[toCurrency]) {
          throw new Error(`Unable to find exchange rate for ${toCurrency}.`)
        }
        return exchangeRates.rates[toCurrency]
      } catch (error) {
        console.error(error)
        return null
      }
    },
  },
  // end methods
  mounted() {
    // const res = this.getExchangeRate("USD", "EUR").then((rate) => console.log(rate));
    console.log('mounted starting...')
  },
}
</script>
