export function orderByDifficulty(pack, progress, lang){
  const errors = progress.errors || {}
  const learned = progress.wordsLearned || {}
  return [...pack].sort((a,b)=>{
    const aWord = a[lang]
    const bWord = b[lang]
    const aScore = (errors[aWord] || 0) - (learned[aWord] || 0)
    const bScore = (errors[bWord] || 0) - (learned[bWord] || 0)
    return bScore - aScore
  })
}
