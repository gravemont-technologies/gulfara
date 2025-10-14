import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Heart, Reply, Plus, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

export default function Forum() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: "Ahmad",
      title: "Best way to memorize Arabic verbs?",
      content: "I'm struggling with verb conjugations. Any tips?",
      likes: 12,
      liked: false,
      replies: 5,
      time: "2h ago"
    },
    {
      id: 2,
      author: "Sarah",
      title: "Looking for study partners",
      content: "Anyone interested in forming a study group?",
      likes: 8,
      liked: false,
      replies: 3,
      time: "4h ago"
    },
    {
      id: 3,
      author: "Omar",
      title: "Deck Trade: Classical Arabic Poetry",
      content: "Trading my poetry deck for modern vocabulary",
      likes: 15,
      liked: true,
      replies: 7,
      time: "6h ago"
    }
  ]);

  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.liked ? post.likes - 1 : post.likes + 1,
          liked: !post.liked
        };
      }
      return post;
    }));
  };

  const handleComment = (postId: number) => {
    if (commentText.trim()) {
      toast({
        title: language === 'ar' ? 'تم إرسال التعليق!' : 'Comment posted!',
        description: language === 'ar' ? 'تم إضافة تعليقك بنجاح.' : 'Your comment has been added successfully.',
      });
      setCommentText("");
      setReplyingTo(null);
      
      // Update replies count
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, replies: post.replies + 1 } : post
      ));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('communityForum')}</h1>
        <Button className="luxury-button">
          <Plus className="w-4 h-4 mr-2" />
          {t('newPost')}
        </Button>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id} className="flashcard">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                  <p className="text-sm text-muted-foreground">by {post.author} • {post.time}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{post.content}</p>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleLike(post.id)}
                  className={post.liked ? "text-red-500" : ""}
                >
                  <Heart className={`w-4 h-4 mr-1 ${post.liked ? 'fill-current' : ''}`} />
                  {post.likes}
                </Button>
                <Button variant="ghost" size="sm">
                  <Reply className="w-4 h-4 mr-1" />
                  {post.replies} {t('replies')}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(post.id)}>
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {t('comment')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                      <DialogTitle>{t('comment')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder={language === 'ar' ? 'اكتب تعليقك...' : 'Write your comment...'}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                      />
                      <Button 
                        onClick={() => handleComment(post.id)}
                        className="luxury-button w-full"
                        disabled={!commentText.trim()}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {language === 'ar' ? 'إرسال' : 'Send'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}