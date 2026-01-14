import { useState } from 'react';
import { MapPin, Star, Phone, ExternalLink, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Ad {
  id: string;
  type: 'restaurant' | 'hotel' | 'tour' | 'service';
  name: string;
  description: string;
  location: string;
  image: string;
  rating: number;
  price?: string;
  featured?: boolean;
}

const FAKE_ADS: Ad[] = [
  {
    id: '1',
    type: 'restaurant',
    name: 'Restaurante Yemanjá',
    description: 'A melhor moqueca de Salvador com vista para o mar. Culinária baiana autêntica desde 1978.',
    location: 'Rio Vermelho, Salvador',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
    rating: 4.9,
    price: '$$',
    featured: true
  },
  {
    id: '2',
    type: 'hotel',
    name: 'Pousada Barra Mar',
    description: 'A 50m do Farol da Barra. Café da manhã regional incluso. Wi-Fi grátis.',
    location: 'Barra, Salvador',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600',
    rating: 4.7,
    price: 'R$ 180/noite'
  },
  {
    id: '3',
    type: 'tour',
    name: 'Passeio Ilha dos Frades',
    description: 'Mergulho em águas cristalinas + almoço típico. Saída de Salvador às 8h.',
    location: 'Baía de Todos os Santos',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600',
    rating: 4.8,
    price: 'R$ 120/pessoa'
  },
  {
    id: '4',
    type: 'service',
    name: 'Acarajé da Cira',
    description: 'Acarajé premiado como o melhor da cidade. Vatapá especial da casa.',
    location: 'Largo da Dinha, Itapuã',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
    rating: 5.0,
    featured: true
  },
  {
    id: '5',
    type: 'restaurant',
    name: 'Casa de Tereza',
    description: 'Alta gastronomia baiana. Pratos autorais com ingredientes locais.',
    location: 'Santo Antônio, Pelourinho',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
    rating: 4.9,
    price: '$$$'
  },
  {
    id: '6',
    type: 'hotel',
    name: 'Hotel Fasano Salvador',
    description: 'Luxo à beira-mar. Spa, piscina infinita e restaurante estrelado.',
    location: 'Praia de Ondina',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600',
    rating: 4.9,
    price: 'R$ 890/noite',
    featured: true
  }
];

const typeLabels = {
  restaurant: 'Restaurante',
  hotel: 'Hospedagem',
  tour: 'Passeio',
  service: 'Serviço'
};

const typeColors = {
  restaurant: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  hotel: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  tour: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  service: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
};

export const FakeAdsSection = () => {
  const [visibleAds, setVisibleAds] = useState<Ad[]>(FAKE_ADS);

  const removeAd = (id: string) => {
    setVisibleAds((prev) => prev.filter((ad) => ad.id !== id));
  };

  if (visibleAds.length === 0) {
    return null;
  }

  return (
    <section className="section-padding bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Destaques de Salvador
            </h2>
            <p className="text-muted-foreground mt-1">
              Os melhores lugares selecionados para você
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Patrocinado
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleAds.map((ad) => (
            <Card 
              key={ad.id}
              className={`overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                ad.featured ? 'ring-2 ring-accent/50' : ''
              }`}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={ad.image}
                  alt={ad.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge variant="outline" className={typeColors[ad.type]}>
                    {typeLabels[ad.type]}
                  </Badge>
                  {ad.featured && (
                    <Badge className="bg-accent text-accent-foreground">
                      Destaque
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => removeAd(ad.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
                  aria-label="Remover anúncio"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">{ad.rating}</span>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-display font-bold text-lg text-foreground mb-2 line-clamp-1">
                  {ad.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                  {ad.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="truncate max-w-[140px]">{ad.location}</span>
                  </div>
                  {ad.price && (
                    <span className="text-sm font-semibold text-primary">
                      {ad.price}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1">
                    <Phone className="h-4 w-4 mr-1" />
                    Contato
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
