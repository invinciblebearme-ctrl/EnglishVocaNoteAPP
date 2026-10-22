const STORAGE_KEY = 'my_voca_list_english_note';

export const getMyVoca = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const addToMyVoca = (word) => {
  const currentList = getMyVoca();
  // 중복 체크 (영단어 기준)
  if (!currentList.find(item => item.en === word.en)) {
    const newList = [...currentList, word];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    return true;
  }
  return false;
};

export const removeFromMyVoca = (en) => {
  const currentList = getMyVoca();
  const newList = currentList.filter(item => item.en !== en);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
};

export const isFavorite = (en) => {
  const currentList = getMyVoca();
  return currentList.some(item => item.en === en);
};
